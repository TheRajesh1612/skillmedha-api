const express = require("express");
const { getTenantDB } = require("../db/connection");
const { connectSharedDB } = require("../db/connection");
const { ObjectId } = require("mongodb");
const router = express.Router();
const mongoDB = require("mongodb");
function notifyRoute(io, getTenantDB) {
  router.post("/notify", async (req, res) => {
    const { type = "tenant", tenantId, userId, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    let db;
    let collectionName = "notifications";

    try {
      // Determine DB and collection based on type
      if (type === "global") {
        // Use a global DB or one shared across all tenants
        const globalDb = await connectSharedDB(); // You need to define this
        db = globalDb;
      } else if (type === "tenant") {
        if (!tenantId) {
          return res
            .status(400)
            .json({ error: "tenantId is required for tenant notifications" });
        }
        db = await getTenantDB(tenantId);
      } else if (type === "user") {
        if (!userId) {
          return res
            .status(400)
            .json({ error: "userId is required for user notifications" });
        }
        if (!tenantId) {
          return res
            .status(400)
            .json({ error: "tenantId is required for user notifications" });
        }

        // Option: Store in tenant DB under a user-specific collection
        db = await getTenantDB(tenantId);
        collectionName = `notifications`;
      } else {
        return res.status(400).json({ error: "Invalid notification type" });
      }

      const collection = db.collection(collectionName);

      const notification = {
        message,
        type,
        tenantId: ["tenant", "user"].includes(type) ? tenantId : null,
        userId: type === "user" ? userId : null,
        createdAt: new Date(),
        readBy: [],
      };

      const result = await collection.insertOne(notification);
      const fullNotif = { ...notification, _id: result.insertedId };

      // Broadcast via Socket.IO
      if (type === "global") {
        io.emit("global-notification", fullNotif); // Send to everyone
      } else if (type === "tenant") {
        // specific Org
        io.to(`tenant_${tenantId}`).emit("tenant-notification", fullNotif);
      } else if (type === "user") {
        // single user
        io.to(`user_${userId}`).emit("user-notification", fullNotif);
      }

      return res.json({ success: true, notification: fullNotif });
    } catch (err) {
      console.error("Error sending notification:", err);
      return res.status(500).json({ error: "Failed to send notification" });
    }
  });

  return router;
}

function markAsReadRoute() {
  router.post("/markasread", async (req, res) => {
    const { type = "tenant", tenantId, notifId, userId } = req.body;

    if (!notifId || !userId) {
      return res.status(400).json({ error: "notifId and userId are required" });
    }

    let db;
    let collectionName = "notifications";

    try {
      // Determine DB and collection
      if (type === "global") {
        const globalDb = await connectSharedDB();
        db = globalDb;
      } else if (type === "tenant") {
        if (!tenantId) {
          return res
            .status(400)
            .json({ error: "tenantId is required for tenant notifications" });
        }
        db = await getTenantDB(tenantId);
      } else if (type === "user") {
        if (!tenantId) {
          return res
            .status(400)
            .json({ error: "tenantId is required for user notifications" });
        }
        db = await getTenantDB(tenantId);
        collectionName = `notifications_user_${userId}`;
      } else {
        return res.status(400).json({ error: "Invalid notification type" });
      }

      const collection = db.collection(collectionName);

      const result = await collection.updateOne(
        { _id: new ObjectId(notifId) },
        { $addToSet: { readBy: userId } }
      );

      if (result.modifiedCount === 0) {
        return res
          .status(404)
          .json({ error: "Notification not found or already marked as read" });
      }

      return res.json({ success: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
      return res
        .status(500)
        .json({ error: "Failed to mark notification as read" });
    }
  });
  return router;
}

module.exports = { notifyRoute, markAsReadRoute };
