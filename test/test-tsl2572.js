import Tsl2572 from '../lib/tsl2572.js';

describe("TSL2572", () => {
	it('Get id()', () => {
		var sensor = new Tsl2572();
		console.log(sensor.id);
	});
	it('Get gain()', () => {
		var sensor = new Tsl2572();
		console.log(sensor.gain);
	});
	it('Get integrationTime()', () => {
		var sensor = new Tsl2572();
		console.log(sensor.integrationTime);
	});
	it('measure()', async () => {
		var sensor = new Tsl2572();
		console.log(await sensor.measure());
	});
});
