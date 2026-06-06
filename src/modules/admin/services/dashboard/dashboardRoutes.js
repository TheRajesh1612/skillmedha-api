// src/routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const dashboardService = require("./dashboardService");

// Get dashboard stats
router.get("/stats", async (req, res) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get all organizations
router.get("/organizations", async (req, res) => {
  try {
    const organizations = await dashboardService.getOrganizations();
    res.json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    console.error("Organizations fetch error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get organization by ID
router.get("/organizations/:orgId", async (req, res) => {
  try {
    const { orgId } = req.params;
    const organization = await dashboardService.getOrganizationById(orgId);
    res.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error("Organization fetch error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get departments by organization
router.get("/organizations/:orgId/departments", async (req, res) => {
  try {
    const { orgId } = req.params;
    const departments = await dashboardService.getDepartmentsByOrg(orgId);
    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error("Departments fetch error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get students by department
router.get(
  "/organizations/:orgId/departments/:departmentId/students",
  async (req, res) => {
    try {
      const { orgId, departmentId } = req.params;
      const { page = 1, limit = 10, search = "" } = req.query;

      const students = await dashboardService.getStudentsByDepartment(
        orgId,
        departmentId,
        parseInt(page),
        parseInt(limit),
        search
      );

      res.json({
        success: true,
        data: students,
      });
    } catch (error) {
      console.error("Students fetch error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// Get growth stats
router.get("/growth", async (req, res) => {
  try {
    const { period = "6months" } = req.query;
    const data = await dashboardService.getGrowthStats(period);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Growth API Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get AI usage growth stats
router.get("/ai-usage-growth", async (req, res) => {
  try {
    const { period = "6months" } = req.query;
    const data = await dashboardService.getAiUsageGrowth(period);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("AI Usage Growth API Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get Course Analytics
router.get("/analytics/courses", async (req, res) => {
  try {
    const data = await dashboardService.getCourseAnalytics();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Job Activity
router.get("/analytics/jobs", async (req, res) => {
  try {
    const data = await dashboardService.getJobActivity();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Placement Analytics
router.get("/analytics/placements", async (req, res) => {
  try {
    const data = await dashboardService.getPlacementAnalytics();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Revenue Analytics
router.get("/analytics/revenue", async (req, res) => {
  try {
    const data = await dashboardService.getRevenueAnalytics();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
