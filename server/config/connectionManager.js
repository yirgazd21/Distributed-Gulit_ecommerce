const mongoose = require('mongoose');

let clusterBConnection = null;
const modelRegistry = new Map();

const setClusterBConnection = (conn) => {
  clusterBConnection = conn;
};

const getPrimaryConnection = () => mongoose.connection;
const getSecondaryConnection = () => clusterBConnection;

const registerModelSchema = (modelName, schema, collection) => {
  if (!modelName || !schema) return;
  modelRegistry.set(modelName, { schema, collection });
};

const getModelSchema = (modelName) => modelRegistry.get(modelName);

const addModelToConnection = (conn, modelName, schema, collection) => {
  if (!conn) return null;
  if (conn.models[modelName]) return conn.model(modelName);
  return conn.model(modelName, schema, collection);
};

const getActiveConnection = () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (clusterBConnection && clusterBConnection.readyState === 1) return clusterBConnection;
  throw new Error('No active MongoDB connection available');
};

const createProxiedModel = (modelName, schema, collection) => {
  registerModelSchema(modelName, schema, collection);
  const proxyTarget = function (...args) {
    const activeModel = addModelToConnection(getActiveConnection(), modelName, schema, collection);
    return new activeModel(...args);
  };

  return new Proxy(proxyTarget, {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      const activeModel = addModelToConnection(getActiveConnection(), modelName, schema, collection);
      const value = activeModel[prop];
      return typeof value === 'function' ? value.bind(activeModel) : value;
    },
    construct(_target, args) {
      const activeModel = addModelToConnection(getActiveConnection(), modelName, schema, collection);
      return new activeModel(...args);
    },
    apply(_target, thisArg, args) {
      const activeModel = addModelToConnection(getActiveConnection(), modelName, schema, collection);
      return activeModel.apply(thisArg, args);
    },
  });
};

module.exports = {
  setClusterBConnection,
  getPrimaryConnection,
  getSecondaryConnection,
  getActiveConnection,
  createProxiedModel,
  addModelToConnection,
  registerModelSchema,
  getModelSchema,
};
