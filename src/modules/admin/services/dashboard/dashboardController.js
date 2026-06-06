// src/controllers/dashboardController.js
const dashboardService = require("../services/dashboardService");

class DashboardController {
  async getOrganizations(req, res) {
    try {
      const organizations = await dashboardService.getOrganizations();

      res.json({
        success: true,
        data: organizations,
      });
    } catch (error) {
      console.error("Error in getOrganizations:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getOrganizationById(req, res) {
    try {
      const { orgId } = req.params;
      const organization = await dashboardService.getOrganizationById(orgId);

      res.json({
        success: true,
        data: organization,
      });
    } catch (error) {
      console.error("Error in getOrganizationById:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getDepartmentsByOrg(req, res) {
    try {
      const { orgId } = req.params;
      const departments = await dashboardService.getDepartmentsByOrg(orgId);

      res.json({
        success: true,
        data: {
          orgId,
          departments,
        },
      });
    } catch (error) {
      console.error("Error in getDepartmentsByOrg:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getStudentsByDepartment(req, res) {
    try {
      const { orgId, departmentId } = req.params;
      const { page = 1, limit = 10, search = "" } = req.query;

      const result = await dashboardService.getStudentsByDepartment(
        orgId,
        departmentId,
        parseInt(page),
        parseInt(limit),
        search
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error in getStudentsByDepartment:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getDashboardStats(req, res) {
    try {
      const stats = await dashboardService.getDashboardStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error in getDashboardStats:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new DashboardController();
