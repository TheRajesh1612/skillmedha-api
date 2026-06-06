module.exports = {
    root: ` 
    scalar JSON
   

        type BrandingInfo { 
            logo : String
            icon: String
            colorPalette : [String]
            typography: [String]
            tagLine : String
            description : String
            websiteData:JSON
        }

          type Business {
                _id: String
                ownerName : String
                address : JSON
                BrandingInfo : BrandingInfo
                SocialMediaInfo : JSON
                DomainInfo : JSON
                GST : String
                tax : String
                businessMail : String
                businessName : String
                phone : String
                integrations : JSON
          }   
          
    
          union BusinessUnion = Business | err
      `,
  
    query: `
              type Query {
                  business(id: String): BusinessUnion
              
          }`,

  };