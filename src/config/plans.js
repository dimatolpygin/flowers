const plans = {
  start: {
    name: "start",
    generationsLimit: 50,
    regenLimitPerOrder: 1,
    resolution: "1K",
    durationDays: 30,
    price: 0
  },
  basic: {
    name: "basic",
    generationsLimit: 150,
    regenLimitPerOrder: 2,
    resolution: "2K",
    durationDays: 30,
    price: 0
  },
  pro: {
    name: "pro",
    generationsLimit: 500,
    regenLimitPerOrder: 3,
    resolution: "4K",
    durationDays: 30,
    price: 0
  }
};

module.exports = plans;
