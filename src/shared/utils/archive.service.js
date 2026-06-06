'use strict';

const config = require('../../config');
const { getSharedMongoClient } = require('../db/connection');
const logger = require('./logger');

function getDatabaseName(collection) {
  if (!collection) {
    throw new Error('Invalid MongoDB collection supplied to archive helper');
  }

  if (collection.db && (collection.db.databaseName || collection.dbName)) {
    return collection.db.databaseName || collection.dbName;
  }

  if (collection.namespace && typeof collection.namespace === 'string') {
    return collection.namespace.split('.')[0];
  }

  throw new Error('Unable to resolve database name from collection');
}

async function getArchiveDb() {
  const client = await getSharedMongoClient();
  return client.db(config.mongo.archiveDbName);
}

async function getDatabaseExists(client, databaseName) {
  try {
    const databases = await client.db('admin').admin().listDatabases();
    return databases.databases.some(db => db.name === databaseName);
  } catch (error) {
    logger.warn('[Archive] Could not verify database exists', {
      databaseName,
      error: error.message,
    });
    return false;
  }
}

async function getArchiveCollection(collection) {
  if (!collection || !collection.collectionName) {
    throw new Error('Invalid MongoDB collection supplied to archive helper');
  }

  const archiveDb = await getArchiveDb();
  return archiveDb.collection(collection.collectionName);
}

function buildArchiveDocument(originalDocument, collectionName, databaseName, deletedBy = null, reason = null) {
  return {
    originalDocument,
    originalCollectionName: collectionName,
    originalDatabaseName: databaseName,
    deletedAt: new Date(),
    deletedBy,
    reason: reason || null,
  };
}

async function archiveAndDeleteOne(collection, filter, options = {}) {
  if (!collection || !filter) {
    throw new Error('archiveAndDeleteOne requires collection and filter');
  }

  const { deletedBy = null, reason = null, softDelete = false } = options;
  const originalDoc = await collection.findOne(filter);

  if (!originalDoc) {
    logger.info('[Archive] No document found to delete', {
      collection: collection.collectionName,
      filter,
    });
    return { deletedCount: 0, archived: false, deletedDocument: null };
  }

  const archiveCollection = await getArchiveCollection(collection);
  const archiveDoc = buildArchiveDocument(
    originalDoc,
    collection.collectionName,
    getDatabaseName(collection),
    deletedBy,
    reason
  );

  const archiveResult = await archiveCollection.insertOne(archiveDoc);
  if (!archiveResult.insertedId) {
    throw new Error('Failed to archive document before delete');
  }

  if (softDelete) {
    const updateResult = await collection.updateOne(filter, {
      $set: {
        deletedAt: archiveDoc.deletedAt,
        deletedBy,
        deletedReason: reason || null,
      },
    });

    if (updateResult.modifiedCount === 0) {
      throw new Error('Failed to mark document as deleted after archival');
    }

    logger.info('[Archive] Document archived and soft-deleted', {
      collection: collection.collectionName,
      archiveCollection: archiveCollection.collectionName,
      deletedBy,
      reason,
      filter,
      archiveId: archiveResult.insertedId,
    });

    return {
      deletedCount: 1,
      archived: true,
      archiveId: archiveResult.insertedId,
      deletedDocument: originalDoc,
      softDeleted: true,
    };
  }

  const deleteResult = await collection.deleteOne(filter);
  if (deleteResult.deletedCount === 0) {
    throw new Error('Failed to delete original document after archival');
  }

  logger.info('[Archive] Document archived and deleted', {
    collection: collection.collectionName,
    archiveCollection: archiveCollection.collectionName,
    deletedBy,
    reason,
    filter,
    archiveId: archiveResult.insertedId,
  });

  return {
    deletedCount: deleteResult.deletedCount,
    archived: true,
    archiveId: archiveResult.insertedId,
    deletedDocument: originalDoc,
  };
}

async function archiveAndDeleteMany(collection, filter, options = {}) {
  if (!collection || !filter) {
    throw new Error('archiveAndDeleteMany requires collection and filter');
  }

  const { deletedBy = null, reason = null, softDelete = false } = options;
  const originalDocs = await collection.find(filter).toArray();

  if (!originalDocs.length) {
    logger.info('[Archive] No documents found to deleteMany', {
      collection: collection.collectionName,
      filter,
    });
    return { deletedCount: 0, archived: false, deletedDocuments: [] };
  }

  const archiveCollection = await getArchiveCollection(collection);
  const archiveDocs = originalDocs.map((doc) =>
    buildArchiveDocument(doc, collection.collectionName, getDatabaseName(collection), deletedBy, reason)
  );

  const archiveResult = await archiveCollection.insertMany(archiveDocs);
  if (!archiveResult.insertedCount || archiveResult.insertedCount !== archiveDocs.length) {
    throw new Error('Failed to archive all documents before deleteMany');
  }

  if (softDelete) {
    const updateResult = await collection.updateMany(filter, {
      $set: {
        deletedAt: new Date(),
        deletedBy,
        deletedReason: reason || null,
      },
    });

    if (updateResult.modifiedCount !== originalDocs.length) {
      throw new Error('Failed to soft-delete all documents after archival');
    }

    logger.info('[Archive] Documents archived and soft-deleted', {
      collection: collection.collectionName,
      archiveCollection: archiveCollection.collectionName,
      deletedBy,
      reason,
      filter,
      archivedCount: archiveResult.insertedCount,
    });

    return {
      deletedCount: updateResult.modifiedCount,
      archived: true,
      archiveCount: archiveResult.insertedCount,
      deletedDocuments: originalDocs,
      softDeleted: true,
    };
  }

  const deleteResult = await collection.deleteMany(filter);
  if (deleteResult.deletedCount !== originalDocs.length) {
    throw new Error('Deleted count did not match archived count after deleteMany');
  }

  logger.info('[Archive] Documents archived and deleted', {
    collection: collection.collectionName,
    archiveCollection: archiveCollection.collectionName,
    deletedBy,
    reason,
    filter,
    archiveCount: archiveResult.insertedCount,
  });

  return {
    deletedCount: deleteResult.deletedCount,
    archived: true,
    archiveCount: archiveResult.insertedCount,
    deletedDocuments: originalDocs,
  };
}

module.exports = {
  archiveAndDeleteOne,
  archiveAndDeleteMany,
  archiveTenantDatabase,
};

async function archiveTenantDatabase(tenantDb, tenantDatabaseName, options = {}) {
  if (!tenantDb || !tenantDatabaseName) {
    throw new Error('archiveTenantDatabase requires tenantDb and tenantDatabaseName');
  }

  const { archivedBy = null, reason = null } = options;
  const archiveDb = await getArchiveDb();
  const archivedAt = new Date();
  let totalArchivedCount = 0;
  let collectionsArchived = [];
  const client = await getSharedMongoClient();

  try {
    // STEP 0: Verify database exists
    const databaseExists = await getDatabaseExists(client, tenantDatabaseName);
    
    logger.info('[Archive] STEP 0: Database existence check', {
      sourceDatabaseName: tenantDatabaseName,
      databaseExists,
    });

    // Get all collections from tenant database
    let collections = await tenantDb.listCollections().toArray();
    
    logger.info('[Archive] STEP 1: List collections from tenant database', {
      sourceDatabaseName: tenantDatabaseName,
      collectionsFound: collections.length,
      collectionNames: collections.map(c => c.name),
      databaseExists,
    });

    // Copy each collection to Archive DB (without metadata, as-is)
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      
      try {
        const tenantCollection = tenantDb.collection(collectionName);
        
        // Get all documents from tenant collection
        const documents = await tenantCollection.find({}).toArray();

        logger.info('[Archive] STEP 2a: Collection documents found', {
          sourceDatabaseName: tenantDatabaseName,
          sourceCollectionName: collectionName,
          documentCount: documents.length,
        });

        if (documents.length > 0) {
          // Store tenant collection inside Archive DB under the tenant database name prefix
          const archiveCollectionName = `${tenantDatabaseName}__${collectionName}`;
          const archiveCollection = archiveDb.collection(archiveCollectionName);

          // Copy documents as-is (no metadata added)
          const archiveResult = await archiveCollection.insertMany(documents);

          logger.info('[Archive] STEP 2b: Collection copied to Archive DB', {
            sourceDatabaseName: tenantDatabaseName,
            sourceCollectionName: collectionName,
            archiveCollectionName,
            documentsCopied: archiveResult.insertedCount,
          });

          collectionsArchived.push({
            collectionName,
            archiveCollectionName,
            documentsCopied: archiveResult.insertedCount,
          });
          totalArchivedCount += archiveResult.insertedCount;
        }
      } catch (collectionError) {
        logger.error('[Archive] STEP 2c: Error copying collection - STOPPING', {
          sourceDatabaseName: tenantDatabaseName,
          sourceCollectionName: collectionName,
          error: collectionError.message,
          errorStack: collectionError.stack,
        });
        throw new Error(`Failed to copy collection ${collectionName}: ${collectionError.message}`);
      }
    }

    logger.info('[Archive] STEP 3: All collections copied successfully', {
      sourceDatabaseName: tenantDatabaseName,
      collectionsArchived: collectionsArchived.length,
      totalDocumentsCopied: totalArchivedCount,
      collectionDetails: collectionsArchived,
    });

    // STEP 3a: Create simple backup metadata in Archive DB
    const backupMetadataCollection = archiveDb.collection('_database_backups');
    const backupMetadata = {
      sourceDatabaseName: tenantDatabaseName,
      collectionsArchived: collectionsArchived.length,
      totalDocumentsCopied: totalArchivedCount,
      collectionDetails: collectionsArchived,
      archivedAt,
      archivedBy,
      reason: reason || null,
    };

    const metadataResult = await backupMetadataCollection.insertOne(backupMetadata);

    logger.info('[Archive] STEP 3a: Backup metadata created', {
      sourceDatabaseName: tenantDatabaseName,
      metadataId: metadataResult.insertedId,
      databaseExists,
    });

    // STEP 4: Only drop database if it actually exists
    if (databaseExists) {
      logger.info('[Archive] STEP 4: About to drop original database', {
        sourceDatabaseName: tenantDatabaseName,
        collectionsArchived: collectionsArchived.length,
        totalDocumentsCopied: totalArchivedCount,
      });

      await tenantDb.dropDatabase();

      logger.info('[Archive] STEP 5: Original database successfully dropped', {
        sourceDatabaseName: tenantDatabaseName,
        collectionsArchived: collectionsArchived.length,
        totalDocumentsCopied: totalArchivedCount,
        databaseDropped: true,
      });
    } else {
      logger.warn('[Archive] STEP 4-5: Original database does not exist, skipping drop', {
        sourceDatabaseName: tenantDatabaseName,
        collectionsArchived: collectionsArchived.length,
        totalDocumentsCopied: totalArchivedCount,
      });
    }

    return {
      success: true,
      sourceDatabaseName: tenantDatabaseName,
      collectionsArchived: collectionsArchived.length,
      totalDocumentsCopied: totalArchivedCount,
      databaseDropped: databaseExists,
      databaseExisted: databaseExists,
      collectionDetails: collectionsArchived,
      backupMetadataId: metadataResult.insertedId,
    };
  } catch (error) {
    logger.error('[Archive] CRITICAL: Error copying database to Archive - DATABASE NOT DROPPED', {
      sourceDatabaseName: tenantDatabaseName,
      collectionsArchivedSoFar: collectionsArchived.length,
      documentsCopiedSoFar: totalArchivedCount,
      error: error.message,
      errorStack: error.stack,
    });
    throw error;
  }
}
