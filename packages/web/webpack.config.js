module.exports = (env) => {
  let config = env.prod ? "prod" : "dev";
  return require(`./webpack.${config}.js`);
};
