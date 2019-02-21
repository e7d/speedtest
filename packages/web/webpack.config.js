module.exports = env => {
  return require(`./webpack.${env}.js`);
};
