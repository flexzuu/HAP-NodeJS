// MQTT Setup
var mqtt = require('mqtt');
console.log("Connecting to MQTT broker...");
var mqtt = require('mqtt');
var options = {
  port: 1883,
  host: 'localhost',
  clientId: 'PC'
};
var client = mqtt.connect(options);
console.log(options.clientId+" Connected to MQTT broker");

client.on('connect', function () {
  client.subscribe(options.clientId+"-in");
});

var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;

// here's a fake hardware device that we'll expose to HomeKit
var ACCESSORY = {
  powerOn: false,

  setPowerOn: function(on) {
    console.log("Turning the "+options.clientId+" %s!", on ? "on" : "off");
    if (on) {
      client.publish(options.clientId+"-out", 'on');
      ACCESSORY.powerOn = on;
   	}
    else {
	    client.publish(options.clientId+"-out",'off');
      ACCESSORY.powerOn = false;
   };

  },
  identify: function() {
    console.log("Identify the "+options.clientId+"!");
  }
}

// Generate a consistent UUID for our light Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the word "Christmaslight".
var accessoryUUID = uuid.generate('hap-nodejs:accessories:'+options.clientId);
console.log(accessoryUUID);
// This is the Accessory that we'll return to HAP-NodeJS that represents our fake light.
var accessory = exports.accessory = new Accessory(options.clientId, accessoryUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
accessory.username = "1B:3C:1C:8D:6E:FF";
accessory.pincode = "031-45-154";

// set some basic properties (these values are arbitrary and setting them is optional)
accessory
  .getService(Service.AccessoryInformation)
  .setCharacteristic(Characteristic.Manufacturer, "Flexzuu")
  .setCharacteristic(Characteristic.Model, "Rev-1")
  .setCharacteristic(Characteristic.SerialNumber, "A1S2NASF88EW");

// listen for the "identify" event for this Accessory
accessory.on('identify', function(paired, callback) {
  ACCESSORY.identify();
  callback(); // success
});

// Add the actual Lightbulb Service and listen for change events from iOS.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
accessory
  .addService(Service.Outlet, options.clientId) // services exposed to the user should have "names" like "Fake Light" for us
  .getCharacteristic(Characteristic.On)
  .on('set', function(value, callback) {
    ACCESSORY.setPowerOn(value);
    callback(); // Our fake Light is synchronous - this value has been successfully set
  });

// We want to intercept requests for our current power state so we can query the hardware itself instead of
// allowing HAP-NodeJS to return the cached Characteristic.value.
accessory
  .getService(Service.Outlet)
  .getCharacteristic(Characteristic.On)
  .on('get', function(callback) {

    // this event is emitted when you ask Siri directly whether your light is on or not. you might query
    // the light hardware itself to find this out, then call the callback. But if you take longer than a
    // few seconds to respond, Siri will give up.

    var err = null; // in case there were any problems

    client.on('message', function (topic, message) {
      switch (message) {
        case "on":
          callback(err, true);
          break;
        default:
          callback(err, false);
          break;
      }
      console.log(message.toString());
    });
  });
