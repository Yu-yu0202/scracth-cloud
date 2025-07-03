export interface CloudRecorder {
    cloud_values: { [key: string]: string | number };
    get_var(varName: string): string | number | null;
    get_all_vars(): { [key: string]: string | number };
    start(): void;
    stop(): void;
    disconnect(): void;
}

export class CloudVariable implements CloudRecorder {
    private websocket: WebSocket | null = null;
    public cloud_values: { [key: string]: string | number } = {};

    constructor(private ws: WebSocket) {
        this.websocket = ws;
    }

    public get_var(varName: string): string | number | null {
        return this.cloud_values[varName] ?? null;
    }

    public get_all_vars(): { [key: string]: string | number } {
        return {...this.cloud_values};
    }

    public start(): void {
        if (!this.websocket) return;
        this.websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.method === "set") {
                    this.cloud_values[data.name] = data.value;
                }
            } catch (e) {
                console.error("Cloud variable parse error:", e);
            }
        };
    }

    public stop(): void {
        if (this.websocket) {
            this.websocket.onmessage = null;
        }
    }

    public disconnect(): void {
        this.stop();
    }
}

export class conn {
    private project_id: string | number;
    private cloud_host: string = 'wss://clouddata.scratch.mit.edu/';
    private username: string;
    private header?: any = {};
    private cookie?: any = {};
    private origin?: string = '';
    private print_connect_message: boolean;
    private websocket: WebSocket | null = null;
    private is_connected: boolean = false;
    private recorder: CloudVariable | null = null;
    
    constructor(project_id: string | number, username: string, cloud_host: string, header?: any, cookie?: any, origin?: string, print_connect_message = true) {
        this.project_id = project_id;
        this.cloud_host = cloud_host;
        this.username = username;
        this.header = header;
        this.cookie = cookie;
        this.origin = origin;
        this.print_connect_message = print_connect_message;
    }

    private handshake(): void {
        if (!this.websocket || this.websocket?.readyState !== 1) throw new Error('cloud variable connection is not established.');
        try {
            this.websocket.send(JSON.stringify({"method": "handshake", "user": this.username, "project_id": this.project_id}));
            this.is_connected = true;
        } catch(e) {
            throw new Error(`[cloud variable] handshake error: ${e as string}`)
        }
        return;
    }

    public createConnection(): void {
        this.websocket = new WebSocket(this.cloud_host);
        this.handshake();
        if (this.print_connect_message) console.log('[cloud variable] connected to cloud server ' + this.cloud_host);
        if (this.websocket) {
            this.recorder = new CloudVariable(this.websocket);
            this.recorder.start();
        }
    }

    public closeConnection(): void {
        try {
            this.recorder?.disconnect();
            this.websocket?.close()
            this.is_connected = false;
            this.recorder = null;
        } catch(e) {
            return;
        }
        return;
    }

    public set_var(variable: string, value: any) {
        if (!this.websocket || !this.is_connected) throw new Error('cloud variable connection is not established.');
        if (variable.startsWith('☁ ')) {
            variable = variable.slice(2);
        }
        this.websocket?.send(JSON.stringify({"method": "set", "name": "☁ " + variable, "value": value, "user": this.username, "project_id": this.project_id}));
    }
    
    public async get_var(variable: string): Promise<string | number | null> {
        if (!this.websocket || !this.is_connected) throw new Error('cloud variable connection is not established.');
        if (!this.recorder) throw new Error('cloud recorder is not initialized.');
        
        if (variable.startsWith('☁ ')) {
            variable = variable.slice(2);
        }
        variable = '☁ ' + variable;

        const startTime = Date.now();
        while (Object.keys(this.recorder.cloud_values).length === 0 && 
               startTime > Date.now() - 5000) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        return this.recorder.get_var(variable);
    }
}