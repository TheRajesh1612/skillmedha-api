// services/proctoring-analytics/autoProctoringConfigGenerator.js
class AutoProctoringConfigGenerator {
  static async generateConfig(
    testData = { securityLevel: "HIGH" },
    institutionSettings = {}
  ) {
    const config = {
      analysisInterval: this.getAnalysisInterval(testData),
      deviceDetection: this.getDeviceConfig(testData),
      faceDetection: this.getFaceConfig(testData),
      gazeDetection: this.getGazeConfig(testData),
      audioDetection: this.getAudioConfig(testData),
      alertSettings: this.getAlertConfig(testData),
    };
    return this.applyInstitutionOverrides(config, institutionSettings);
  }

  static getAnalysisInterval(testData) {
    if (testData?.securityLevel === "HIGH" || testData?.isHighStakes) {
      return { enabled: true, min: 1, max: 5 };
    } else if (testData?.securityLevel === "MEDIUM") {
      return { enabled: true, min: 1, max: 5 };
    }
    return { enabled: true, min: 1, max: 5 };
  }

  static getDeviceConfig(testData) {
    const config = {
      enabled: true,
      allowedDevices: {
        mobile: false,
        calculator: false,
        laptop: false,
        tablet: false,
        smartwatch: false,
      },
    };
    if (testData?.subject === "mathematics" || testData?.allowCalculator)
      config.allowedDevices.calculator = true;
    if (testData?.examType === "open_book" || testData?.allowResearch) {
      config.allowedDevices.laptop = true;
      config.allowedDevices.tablet = true;
    }
    return config;
  }

  static getGazeConfig(testData) {
    if (testData?.securityLevel === "HIGH") {
      return {
        enabled: true,
        suspiciousYaw: 30,
        suspiciousPitch: 20,
        confidenceThreshold: 80,
        consecutiveViolations: 2,
        alerts: {
          lookingAway: true,
          lookingUp: true,
          lookingDown: true,
          persistentGaze: true,
        },
      };
    } else if (testData?.securityLevel === "MEDIUM") {
      return {
        enabled: true,
        suspiciousYaw: 45,
        suspiciousPitch: 30,
        confidenceThreshold: 70,
        consecutiveViolations: 3,
        alerts: {
          lookingAway: true,
          lookingUp: true,
          lookingDown: true,
          persistentGaze: false,
        },
      };
    }
    return { enabled: false };
  }

  static getFaceConfig(testData) {
    return {
      multiplePeopleAlert: true,
      absentStudentAlert: testData?.securityLevel !== "LOW",
      confidenceThreshold: testData?.securityLevel === "HIGH" ? 85 : 75,
    };
  }

  static getAudioConfig(testData) {
    if (testData?.securityLevel === "LOW" || testData?.disableAudioMonitoring) {
      return { enabled: false };
    }
    return {
      enabled: true,
      multipleSpeakerAlert: true,
      suspiciousContentAlert: testData?.securityLevel === "HIGH",
      keywordDetection: testData?.securityLevel === "HIGH",
      confidenceThreshold: 75,
      analysisInterval: testData?.securityLevel === "HIGH" ? 20 : 30,
    };
  }

  static getAlertConfig(testData) {
    const immediate = ["MULTIPLE_PEOPLE", "PROHIBITED_DEVICE"];
    if (testData?.securityLevel === "HIGH")
      immediate.push("GAZE_VIOLATION", "AUDIO_VIOLATION");
    return {
      immediateAlert: immediate,
      delayedAlert: ["STUDENT_ABSENT"],
      autoCapture: testData?.securityLevel !== "LOW",
    };
  }

  static applyInstitutionOverrides(config, institutionSettings) {
    if (institutionSettings.forceAudioMonitoring)
      config.audioDetection.enabled = true;
    if (institutionSettings.strictGazeMonitoring) {
      config.gazeDetection.suspiciousYaw = 25;
      config.gazeDetection.suspiciousPitch = 15;
    }
    if (institutionSettings.allowedDevices) {
      config.deviceDetection.allowedDevices = {
        ...config.deviceDetection.allowedDevices,
        ...institutionSettings.allowedDevices,
      };
    }
    return config;
  }
}

module.exports = AutoProctoringConfigGenerator;
