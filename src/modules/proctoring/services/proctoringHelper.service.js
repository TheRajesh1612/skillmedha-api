const getTotalPersons = (data) => {
  let totalPersons = 0;
  data.forEach((label) => {
    if (label.Categories.find((e) => e.Name.includes("Person"))) {
      let newTotalPersons = label.Instances.length;
      if (newTotalPersons > totalPersons) totalPersons = newTotalPersons;
    }
  });
  return totalPersons;
};

const checkExtraDevices = (data) => {
  let device = false;
  let phone = false;
  let computer = false;
  let earphones = false
  data.forEach((label) => {
    if (label.Categories.find((e) => e.Name.includes("Technology"))) {
      if (label.Instances.length) {
        if (label.Name.includes("Phone")) phone = true;
        if (label.Name.includes("Computer")) computer = true;
        if (label.Name.includes("Laptop")) computer = true;
        if (label.Name.includes("Mobile")) phone = true;
        if(label.Name.includes("Headphones")) earphones = true
        device = true;
      }
    }
  });
  return { device, phone,computer };
};

module.exports = { getTotalPersons,checkExtraDevices };
