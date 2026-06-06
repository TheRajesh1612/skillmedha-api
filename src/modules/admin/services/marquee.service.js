const { marqueeNotices } = require("../../../shared/db/connection").getGlobalCollections();
const { ObjectId } = require("mongodb");
const { archiveAndDeleteOne } = require("../../../shared/utils/archive.service");
// --- AWS S3 (kept for reference) ---
// const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

// --- Azure Blob Storage ---
const azureBlobService = require("../../../shared/utils/azureBlobService");

// --- AWS S3 client (kept for reference) ---
// const s3 = new S3Client({
//   credentials: {
//     accessKeyId: process.env.AWS_KEY_S3,
//     secretAccessKey: process.env.AWS_SECRET_S3,
//   },
//   region: process.env.AWS_REGION,
// });

// --- AWS S3 uploadFile (kept for reference) ---
// const uploadFile = (fileName, bucketName) => {
//   const fileContent = fs.readFileSync(fileName);
//   const params = {
//     Bucket: bucketName,
//     Key: path.basename(fileName),
//     Body: fileContent,
//     ServerSideEncryption: "AES256",
//     StorageClass: "STANDARD_IA",
//   };
//   return s3.send(new PutObjectCommand(params));
// };

// --- Azure Blob uploadFile ---
const uploadFile = async (fileName, bucketName) => {
  const result = await azureBlobService.uploadFileToBlob(
    fileName,
    bucketName,
    path.basename(fileName)
  );
  return { "$metadata": { httpStatusCode: result.success ? 200 : 500 }, url: result.url };
};

// --- AWS S3 getFileURI (kept for reference) ---
// const getFileURI = (bucketName, key) =>
//   `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

// --- Azure Blob getFileURI ---
const getFileURI = (containerName, key) =>
  azureBlobService.getBlobUrl(containerName, key);

module.exports.createMarqueeNotice = async (req, res) => {
  try {
    const { title, description, url, bucketName, hasForm, expiryDate } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
    }
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    if (!expiryDate) {
      return res.status(400).json({ error: "Expiry Date is required" });
    }

    const parsedHasForm = hasForm === "true" || hasForm === true;
    const parsedExpiryDate = new Date(expiryDate);

    let thumbnailUrl = "";

    if (req.file) {
      if (!bucketName) {
        return res.status(400).json({ error: "bucketName is required for image upload" });
      }

      const filePath = req.file.path;
      const key = path.basename(filePath);

      try {
        const uploadResult = await uploadFile(filePath, bucketName);
        if (uploadResult["$metadata"].httpStatusCode !== 200) {
          throw new Error("Failed to upload to S3");
        }
        thumbnailUrl = getFileURI(bucketName, key);

        // Clean up local file
        fs.unlinkSync(filePath);
      } catch (uploadError) {
        // Try to clean up local file if upload fails
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        throw uploadError;
      }
    }

    const noticeData = {
      title,
      description,
      url: url || "",
      thumbnail: thumbnailUrl,
      hasForm: parsedHasForm,
      expiryDate: parsedExpiryDate,
      createdAt: new Date(),
      active: true,
    };

    const result = await marqueeNotices.insertOne(noticeData);

    res.status(201).json({
      message: "Marquee notice created successfully",
      data: { ...noticeData, _id: result.insertedId }
    });

  } catch (error) {
    console.error("Error creating marquee notice:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports.getMarqueeNotices = async (req, res) => {
  try {
    const settings = await marqueeNotices.findOne({ type: "global_settings" });
    const globalEnabled = settings ? settings.globalEnabled : true; // Default to true if not set

    if (req.query.active) {
      const currentDate = new Date();
      const notices = await marqueeNotices.find({ 
        active: true, 
        type: { $ne: "global_settings" },
        $or: [
          { expiryDate: { $gte: currentDate } },
          { expiryDate: { $exists: false } },
          { expiryDate: null }
        ]
      }).sort({ createdAt: -1 }).toArray();
      res.status(200).json({ data: notices, globalEnabled });
    } else {
      const notices = await marqueeNotices.find({ type: { $ne: "global_settings" } }).sort({ createdAt: -1 }).toArray();
      res.status(200).json({ data: notices, globalEnabled });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports.deleteMarqueeNotice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID is required" });

    const archiveResult = await archiveAndDeleteOne(marqueeNotices, { _id: new ObjectId(id) }, {
      deletedBy: req.userID || null,
      reason: req.body.reason || null,
    });

    if (archiveResult.deletedCount === 0) {
      return res.status(404).json({ error: "Notice not found" });
    }

    res.status(200).json({ message: "Notice deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports.updateMarqueeNotice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID is required" });

    const updates = { ...req.body };
    delete updates._id; // Prevent updating _id

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // If active is passed as string "true"/"false", convert it
    if (updates.active === "true") updates.active = true;
    if (updates.active === "false") updates.active = false;

    if (updates.hasForm !== undefined) {
      updates.hasForm = updates.hasForm === "true" || updates.hasForm === true;
    }
    if (updates.expiryDate !== undefined) {
      updates.expiryDate = new Date(updates.expiryDate);
    }

    const result = await marqueeNotices.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Notice not found" });
    }

    res.status(200).json({ message: "Notice updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports.getMarqueeSettings = async (req, res) => {
  try {
    const settings = await marqueeNotices.findOne({ type: "global_settings" });
    if (!settings) {
      return res.status(200).json({ data: { globalEnabled: true } });
    }
    res.status(200).json({ data: settings });
  } catch (error) {
    console.error("Error fetching marquee settings:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports.updateMarqueeSettings = async (req, res) => {
  try {
    const { globalEnabled } = req.body;
    
    await marqueeNotices.updateOne(
      { type: "global_settings" },
      { $set: { globalEnabled: globalEnabled === true || globalEnabled === "true" } },
      { upsert: true }
    );
    res.status(200).json({ message: "Settings updated successfully", data: { globalEnabled } });
  } catch (error) {
    console.error("Error updating marquee settings:", error);
    res.status(500).json({ error: error.message });
  }
};