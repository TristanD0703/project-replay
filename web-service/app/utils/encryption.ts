import {
    scrypt,
    scryptSync,
    createCipheriv,
    createDecipheriv,
    randomBytes,
} from 'node:crypto';

export default class Encryption {
    password: string;
    algorithm: string;

    constructor() {
        const password = process.env.ENCRYPTION_KEY;
        if (!password) throw new Error('ENCRYPTION_KEY not provided in env');
        this.password = password;

        const algorithm = process.env.ENCRYPTION_ALGORITHM;
        if (!algorithm)
            throw new Error('ENCRYPTION_ALGORITHM not provided in env');
        this.algorithm = algorithm;
    }

    async encrypt(data: string, salt: string): Promise<string> {
        const promise = new Promise<string>((res, rej) => {
            scrypt(this.password, salt, 24, (err, key) => {
                if (err) rej(err);
                const iv = new Uint8Array(16);

                const cipher = createCipheriv(this.algorithm, key, iv);

                let encrypted = '';
                cipher.setEncoding('hex');

                cipher.on('data', (chunk) => (encrypted += chunk));
                cipher.on('end', () => {
                    res(encrypted);
                });

                cipher.write(data);
                cipher.end();
            });
        });

        return promise;
    }

    async decrypt(encrypted: string, salt: string) {
        const key = scryptSync(this.password, salt, 24);
        const iv = Buffer.alloc(16, 0);
        const decipher = createDecipheriv(this.algorithm, key, iv);

        const promise = new Promise<string>((res, rej) => {
            let decrypted = '';
            decipher.on('readable', () => {
                let chunk;
                while (null !== (chunk = decipher.read())) {
                    decrypted += chunk.toString('utf8');
                }
            });

            decipher.on('end', () => {
                res(decrypted);
            });

            decipher.write(encrypted, 'hex');
            decipher.end();
        });

        return promise;
    }

    generateSalt(): string {
        return randomBytes(32).toString('hex');
    }
}
