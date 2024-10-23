import os from 'os';

export function getLocalIP(): string | null {
    const networkInterfaces = os.networkInterfaces();
    let localIP: string | null = null;

    Object.keys(networkInterfaces).forEach((iface) => {
        const addresses = networkInterfaces[iface];

        if (addresses) {  // Vérifie si addresses n'est pas undefined
            addresses.forEach((details) => {
                if (details.family === 'IPv4' && !details.internal && details.address.startsWith('10.')) {
                    localIP = details.address;
                }
            });
        }
    });

    return localIP;
}