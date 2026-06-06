// azureStorage/azureBlobService.js
// Central Azure Blob Storage helper module — drop-in replacement for S3 operations
const {
    BlobServiceClient,
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters,
    BlobSASPermissions,
} = require("@azure/storage-blob");
const fs = require("fs");
const path = require("path");

/**
 * Creates and returns an authenticated BlobServiceClient.
 * Uses connection string if available, otherwise falls back to account name/key.
 */
function createBlobServiceClient() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (connectionString) {
        return BlobServiceClient.fromConnectionString(connectionString);
    }

    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    if (!accountName || !accountKey) {
        throw new Error(
            "Azure Storage: Provide AZURE_STORAGE_CONNECTION_STRING or both AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY"
        );
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(
        accountName,
        accountKey
    );
    return new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        sharedKeyCredential
    );
}

// Singleton — initialised lazily on first call
let _blobServiceClient = null;
function getBlobServiceClient() {
    if (!_blobServiceClient) {
        _blobServiceClient = createBlobServiceClient();
    }
    return _blobServiceClient;
}

/**
 * Ensure a container exists (equivalent to S3 CreateBucket + HeadBucket).
 * @param {string} containerName
 */
async function ensureContainerExists(containerName) {
    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(containerName);
    await containerClient.createIfNotExists(); // private access (no public access)
    return containerClient;
}

/**
 * Upload a blob to Azure Blob Storage (equivalent to S3 PutObjectCommand).
 * @param {string} containerName  — equivalent to S3 Bucket
 * @param {string} blobName       — equivalent to S3 Key
 * @param {Buffer|string} content — file content
 * @param {string} [contentType]  — MIME type
 * @param {object} [metadata]     — key-value metadata
 * @returns {{ url: string, success: boolean }}
 */
async function uploadBlob(
    containerName,
    blobName,
    content,
    contentType,
    metadata
) {
    const containerClient = await ensureContainerExists(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const options = {};
    if (contentType) {
        options.blobHTTPHeaders = { blobContentType: contentType };
    }
    if (metadata) {
        // Azure metadata keys must be valid C# identifiers (no special chars).
        // Sanitise keys: replace non-alphanumeric chars with underscores.
        const sanitised = {};
        for (const [k, v] of Object.entries(metadata)) {
            sanitised[k.replace(/[^a-zA-Z0-9]/g, "_")] = String(v);
        }
        options.metadata = sanitised;
    }

    await blockBlobClient.upload(content, Buffer.byteLength(content), options);

    return {
        success: true,
        url: getBlobUrl(containerName, blobName),
    };
}

/**
 * Upload a local file to Azure Blob Storage.
 * @param {string} filePath       — local file path
 * @param {string} containerName  — container (bucket)
 * @param {string} [blobName]     — blob key (defaults to basename of filePath)
 * @param {string} [contentType]  — MIME type
 * @returns {{ url: string, success: boolean }}
 */
async function uploadFileToBlob(filePath, containerName, blobName, contentType) {
    const fileContent = fs.readFileSync(filePath);
    const key = blobName || path.basename(filePath);
    return uploadBlob(containerName, key, fileContent, contentType);
}

/**
 * Download a blob from Azure (equivalent to S3 GetObjectCommand).
 * @param {string} containerName
 * @param {string} blobName
 * @returns {Buffer}
 */
async function downloadBlob(containerName, blobName) {
    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    const downloadResponse = await blobClient.download(0);
    const chunks = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

/**
 * Delete a blob from Azure (equivalent to S3 deleteObject).
 * @param {string} containerName
 * @param {string} blobName
 */
async function deleteBlob(containerName, blobName) {
    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);
    await blobClient.deleteIfExists();
}

/**
 * List blobs by prefix (equivalent to S3 listObjectsV2).
 * @param {string} containerName
 * @param {string} prefix
 * @param {number} [maxResults=10]
 * @returns {Array<{name: string, contentLength: number, lastModified: Date}>}
 */
async function listBlobs(containerName, prefix, maxResults = 10) {
    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(containerName);

    const results = [];
    const iter = containerClient.listBlobsFlat({ prefix });
    for await (const blob of iter) {
        results.push({
            Key: blob.name, // match S3 key naming for compatibility
            name: blob.name,
            contentLength: blob.properties.contentLength,
            lastModified: blob.properties.lastModified,
        });
        if (results.length >= maxResults) break;
    }
    return results;
}

/**
 * Get the public URL for a blob (equivalent to S3 getFileURI).
 * Since the storage account has public access disabled, this generates
 * a long-lived SAS (Shared Access Signature) token for read access.
 * @param {string} containerName
 * @param {string} blobName
 * @returns {string}
 */
function getBlobUrl(containerName, blobName) {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

    const actualAccountName = accountName || extractAccountName(connectionString);
    const baseUrl = `https://${actualAccountName}.blob.core.windows.net/${containerName}/${blobName}`;

    try {
        const actualAccountKey = accountKey || extractAccountKey(connectionString);
        if (!actualAccountName || !actualAccountKey) {
            return baseUrl; // Fallback if no credentials available
        }

        const sharedKeyCredential = new StorageSharedKeyCredential(
            actualAccountName,
            actualAccountKey
        );

        // Generate a SAS token valid for 10 years (effectively permanent for the app)
        const sasOptions = {
            containerName,
            blobName,
            permissions: BlobSASPermissions.parse("r"), // Read only
            startsOn: new Date(),
            expiresOn: new Date(new Date().setFullYear(new Date().getFullYear() + 10)),
        };

        const sasToken = generateBlobSASQueryParameters(
            sasOptions,
            sharedKeyCredential
        ).toString();

        return `${baseUrl}?${sasToken}`;
    } catch (error) {
        console.error("❌ Failed to generate SAS token:", error.message);
        return baseUrl;
    }
}

/**
 * Extract the account name from a connection string.
 */
function extractAccountName(connectionString) {
    if (!connectionString) return "unknown";
    const match = connectionString.match(/AccountName=([^;]+)/i);
    return match ? match[1] : "unknown";
}

/**
 * Extract the account key from a connection string.
 */
function extractAccountKey(connectionString) {
    if (!connectionString) return null;
    const match = connectionString.match(/AccountKey=([^;]+)/i);
    return match ? match[1] : null;
}

module.exports = {
    getBlobServiceClient,
    ensureContainerExists,
    uploadBlob,
    uploadFileToBlob,
    downloadBlob,
    deleteBlob,
    listBlobs,
    getBlobUrl,
};
