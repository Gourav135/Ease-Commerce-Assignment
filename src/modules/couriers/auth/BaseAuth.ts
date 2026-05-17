import { LoginAuth } from "./LoginAuth";


export class BaseAuth  {
    private partner: any;
    private methods: { login: LoginAuth };
    constructor(partner: string) {
        this.partner = partner;
        this.methods = {
            login: new LoginAuth(this.partner)
        }
    }

    getBody(AuthType: any) {
        // @ts-ignore
        const method = this.methods[AuthType];
        if(!method) {
            throw new Error('Method not implemented');
        }
        return method.execute();
    }
}