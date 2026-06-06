module.exports = {
    root: ` 
    scalar JSON
   

        type Language { 
            _id: String
            type : String
            name: String
        }
    
      `,
  
    query: `
              type Query {
                  language(type: String): [Language]
              
          }`,

  };