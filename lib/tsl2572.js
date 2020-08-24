const i2c = require('i2c-bus')

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

export default class Tsl2572 {
	constructor(bus_num = 1, address = 0x39) {
		this.device = i2c.openSync(bus_num)
		this.address = address

		this.gain = 1
		this.integrationTime = 50
	}

	static readBlock(device, address, command, length) {
		let result = []
		let buffer = Buffer.alloc(length)
		device.readI2cBlockSync(address, 0x80 + command, length, buffer)
		for(let n = 0; n < length; n++) {
			result.push(buffer.readUInt8(n))
		}
		return result 
	}

	static writeBlock(device, address, command, data) {
		const buffer = Buffer.from(data)
		device.writeI2cBlockSync(address, 0x80 + command, buffer.length, buffer)
	}

	read(command, length) {
		return Tsl2572.readBlock(this.device, this.address, command, length)
	}
	
	write(command, data) {
		return Tsl2572.writeBlock(this.device, this.address, command, [data])
	}

	get id() {
		const REGISTER_ID = 0x12;
		let id = this.read(REGISTER_ID, 1)
		return id[0]
	}

	set gain(gain) {
		const REGISTER_CONFIGURATION = 0x0D;
		const REGISTER_CONTROL = 0x0F;
		if(gain === 0.16) {
			this.write(REGISTER_CONFIGURATION, 4);
			this.write(REGISTER_CONTROL, 0);
		} else if(gain == 1) {
			this.write(REGISTER_CONFIGURATION, 0);
			this.write(REGISTER_CONTROL, 0);
		} else if(gain == 8) {
			this.write(REGISTER_CONFIGURATION, 0);
			this.write(REGISTER_CONTROL, 1);
		} else if(gain == 16) {
			this.write(REGISTER_CONFIGURATION, 0);
			this.write(REGISTER_CONTROL, 2);
		} else {
			this.write(REGISTER_CONFIGURATION, 0);
			this.write(REGISTER_CONTROL, 3);
		}
	}

	get gain() {
		const REGISTER_CONFIGURATION = 0x0D;
		const REGISTER_CONTROL = 0x0F;
		let confreg = this.read(REGISTER_CONFIGURATION, 1)[0]  & 0x04;
		let contreg = this.read(REGISTER_CONTROL, 1)[0] & 0x03;
		let result = 120

		if( (confreg == 0x04) && (contreg == 0x00) ) {
			result = 0.16
		} else if( (confreg == 0x00) && (contreg == 0x00) ) {
			result = 1
		} else if( (confreg == 0x00) && (contreg == 0x01) ) {
			result = 8
		} else if( (confreg == 0x00) && (contreg == 0x02) ) {
			result = 16
		}

		return result
	}

	set integrationTime(time_ms) {
		const REGISTER_ALS_TIMING = 0x01
		let register_value = 0xFF
		if( time_ms >= 699 ) {
			register_value = 0xFF;
		} else {
			register_value = 256 - (time_ms / 2.73);
		}
		this.write(REGISTER_ALS_TIMING, register_value)
	}

	get integrationTime() {
		const REGISTER_ALS_TIMING = 0x01
		let als_timing = this.read(REGISTER_ALS_TIMING, 1)[0]
		return (256 - als_timing) * 2.73
	}

	get state() {
		const REGISTER_STATUS = 0x13
		return (this.read(REGISTER_STATUS, 1)[0] & 0x11)
	}

	_stopALS() {
		const REGISTER_ENABLE = 0x00
		this.write(REGISTER_ENABLE, 0x01)
	}

	_startALS() {
		const REGISTER_ENABLE = 0x00
		this.write(REGISTER_ENABLE, 0x03)
	}

	_setSleep() {
		const REGISTER_ENABLE = 0x00
		this.write(REGISTER_ENABLE, 0x00)
	}
	
	async measure() {
		let gain = this.gain
		let integrationTime = this.integrationTime

		this._stopALS();

		this._startALS();

		for(let n = 0; n < 100; n++) {
			await sleep(10);
			if(this.state === 0x11) {
				break;
			}
		}

		this._stopALS()
		this._setSleep()

		const REGISTER_ADC_CHANNEL_DATA = 0x14
		const result = this.read(REGISTER_ADC_CHANNEL_DATA, 4)
		const ch0 = (result[1] << 8) | result[0]
		const ch1 = (result[3] << 8) | result[2]

		const cpl  = (integrationTime * gain) / 60
		const lux1 = (1.0 * ch0 - 1.87 * ch1) / cpl
		const lux2 = (0.63 * ch0 - 1.0 * ch1) / cpl

		const lux = Math.max(0, lux1, lux2);

		return lux
	}
}
