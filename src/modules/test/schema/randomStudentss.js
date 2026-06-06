module.exports = {
    root: ` 
   
          type randomStudent {
              _id: String
              firstName:String
              lastName:String
              userName: String
              phone: String
              image : String
              email: String
              password: String
              tempPass: String
              gender : String
              dob: String
              createdAt: String
              updatedAt: String
              progress: [Progress]
              token : String
              location : String
              otp:String
              Notes : [JSON]
              attandance : String
              blocked : String
          }
        
       
          union randomStudentUnion = randomStudent | err
          `,
    query: `
          type Query {
              randomStudents: [randomStudent]
              randomStudent(_id:String):randomStudentUnion 
          }`,
   
  };