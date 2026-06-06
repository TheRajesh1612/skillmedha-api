module.exports = {
    root: ` 
   
          type Student {
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
              tests:[Test]
              attemptedProgress : JSON
              faceData : JSON 
              globalId:String
              department:String
          }
        
       
          union StudentUnion = Student | err
          `,
    query: `
          type Query {
              students: [Student]
              student(_id:String):StudentUnion 
          }`,

};