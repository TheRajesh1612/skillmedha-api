const cheerio = require("cheerio");

const isHTML = (str) => {
  const regex = /<([A-Z][A-Z0-9]*)\b[^>]*>(.*?)<\/\1>/i;
  return regex.test(str);
};

const htmlToText = (content) => {
  if (isHTML(content)) {
    const $ = cheerio.load(content);
    return $.text();
  } else {
    return content;
  }
};

exports.getShortParaScore = (ans, studentResp) => {
  let correctScore = 0,
    correctFlag;
  negativeScore = 0;
  const scoreType = ans.scoreSettings.scoreType;
  const parsedAns = htmlToText(JSON.parse(ans.answer.shortPara));
  if (scoreType == "fullScore") {
    if (
      parsedAns.toLowerCase().trim() ==
      studentResp?.answers[0]?.toLowerCase().trim()
    ) {
      correctScore = ans.scoreSettings.pointsForCorrectAns || 0;
      correctFlag = true;
    } else {
      // correctScore = ans.scoreSettings.pointsForCorrectAns || 0;
      if(ans.scoreSettings.pointsForIncorrectAns < 0) {
        negativeScore = ans.scoreSettings.pointsForIncorrectAns || 0;
      }
      correctFlag = false;
    }
  }
  if (scoreType == "partialScore") {
    //  TODO :-- To be added by AI
    correctFlag = false
  }
  return { correctScore, negativeScore, correctFlag };
};

exports.getSingleChoiceScore = (ans, studentResp) => {
  let correctScore = 0,
    correctFlag;
  negativeScore = 0;
  let parsedAns = ans.answer.singleChoice;
  if(typeof  ans.answer.singleChoice == "object"){
    const keys = Object.keys( ans.answer.singleChoice)


    parsedAns = keys[0]
  }
 
  if (parsedAns?.toLowerCase() == studentResp.answers[0]?.toLowerCase()) {
    correctScore = ans.scoreSettings.pointsForCorrectAns || 0;
    correctFlag = true;
  } else {
    // correctScore = ans.scoreSettings.pointsForCorrectAns || 0;
    if(ans.scoreSettings.pointsForIncorrectAns < 0) {
      negativeScore = ans.scoreSettings.pointsForIncorrectAns || 0;
    }
    correctFlag = false;
  }
  return { correctScore, negativeScore, correctFlag };
};
exports.getTrueFalseScore = (ans, studentResp) => {
  let correctScore = 0,
    correctFlag;

  negativeScore = 0;
  const parsedAns = ans.answer.truefalse;
  if (
    String(parsedAns).toLowerCase().trim() ==
    studentResp?.answers[0]?.toLowerCase().trim()
  ) {
    correctScore = ans.scoreSettings.pointsForCorrectAns || 0;
    correctFlag = true;
  } else {
    // correctScore = ans.scoreSettings.pointsForCorrectAns || 0;
    if(ans.scoreSettings.pointsForIncorrectAns < 0) {
      negativeScore = ans.scoreSettings.pointsForIncorrectAns || 0;
    }
    correctFlag = false;
  }
  return { correctScore, negativeScore, correctFlag };
};

exports.getMultipleChoiceScore = (ans, studentResp) => {
  let correctScore = 0,
    negativeScore = 0,
    bonusScore = 0,
    correctFlag = false; 
  const scoreType = ans.scoreSettings.scoreType;

  
  let newResponses = studentResp.answers.filter(
    (e) => ans.answer.multipleChoice[e?.toLowerCase()]
  );

  if (scoreType === "fullScore") {
    
    if (
      newResponses.length === Object.values(ans.answer.multipleChoice).filter(Boolean).length &&
      studentResp.answers.length === Object.values(ans.answer.multipleChoice).filter(Boolean).length
    ) {
      correctScore = ans.scoreSettings.pointsForCorrectAns || 0;
      correctFlag = true;
    } else {
      // correctScore = ans.scoreSettings.pointsForCorrectAns || 0;
      if(ans.scoreSettings.pointsForIncorrectAns < 0) {
        negativeScore = ans.scoreSettings.pointsForIncorrectAns || 0;
      }
    }
  } else if (scoreType === "partialScore") {
    let correctAnswersCount = 0;
    let incorrectAnswerGiven = false;
    
    studentResp.answers.forEach((response) => {
      if (ans.answer.multipleChoice[response?.toLowerCase()]) {
        correctAnswersCount += 1; 
      } else {
        incorrectAnswerGiven = true; 
        negativeScore += ans.scoreSettings.pointsForEachIncorrectAns || 0; 
      }
    });

    
    correctScore = correctAnswersCount * parseFloat(ans.scoreSettings.PointsForEachCorrectAnswer);

    
    if (
      correctAnswersCount === Object.keys(ans.answer.multipleChoice).length &&
      studentResp.answers.length === Object.keys(ans.answer.multipleChoice).length
    ) {
      bonusScore = ans.scoreSettings.bonusPointsForAllCorrect || 0;
      correctFlag = true;
    } else if (correctAnswersCount > 0 && !incorrectAnswerGiven) {
      
      correctFlag = true;
    }
  }

  
  return { correctScore, negativeScore, correctFlag, bonusScore };
};


