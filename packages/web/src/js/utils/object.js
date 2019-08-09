export { convertPaths, deepMerge, pathToObj };

/**
 * Deep merge a collection of objects
 * @param {...any} objects
 */
const deepMerge = (...objects) => {
  const merged = {};
  let i = 0;

  const merge = object => {
    for (const property in object) {
      if (!object.hasOwnProperty(property)) continue;
      if (Array.isArray(object[property])) {
        merged[property] = [].concat(merged[property] || [], object[property]);
        continue;
      }
      if (Object.prototype.isPrototypeOf(object[property])) {
        merged[property] = deepMerge(merged[property], object[property]);
        continue;
      }
      merged[property] = object[property];
    }
  };

  for (; i < objects.length; i++) {
    merge(objects[i]);
  }

  return merged;
};

/**
 * Transform a string path to an object
 * @param {Array} path
 * @param {any} value
 */
const pathToObj = (path, value = null) => {
  return path
    .split(".")
    .reverse()
    .reduce((value, key) => Object.defineProperty({}, key, { value, enumerable: true }), value);
};

/**
 * Convert object string paths to real paths
 * @param {any} object
 */
const convertPaths = object => {
  return Object.keys(object).reduce((obj, key) => {
    return deepMerge(obj, pathToObj(key, object[key]));
  }, {});
};
