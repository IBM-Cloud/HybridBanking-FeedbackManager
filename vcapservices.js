var vcapServices;
// if running in Bluemix, use the environment variables
// http://blog.ibmjstart.net/2015/08/31/abstracting-out-environment-variables-for-bluemix/
if (process.env.VCAP_SERVICES) {
  vcapServices = JSON.parse(process.env.VCAP_SERVICES);
// otherwise use our JSON file
} else {
  try {
    vcapServices = require('./VCAP_SERVICES.json');
  } catch (e) {
    console.error(e);
  }
}
module.exports = vcapServices;
