import {config} from "../../../config";


export class LoginAuth {
    private partner: keyof typeof config;
    constructor(partner: keyof typeof config) {
        this.partner = partner;
    }

    execute() {
        if(config[this.partner] === undefined) {
            throw new Error(`Configuration for partner ${this.partner} is missing`);
        }
        return JSON.stringify({
            username: config[this.partner].username,
            password: config[this.partner].password,
        });
    }
}