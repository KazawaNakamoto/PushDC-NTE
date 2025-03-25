import fetch from 'node-fetch';
import readline from 'readline-sync';
import fs from 'fs';
import chalk from 'chalk';
import cfonts;

cfonts.say('NT Exhaust', {
    font: 'block',
    align: 'center',
    colors: ['cyan', 'magenta'],
    background: 'black',
    letterSpacing: 1,
    lineHeight: 1,
    space: true,
    maxLength: '0',
});

console.log(chalk.green("=== Telegram Channel : NT Exhaust ( @NTExhaust ) ==="));

const channelIds = readline.question("Masukkan ID channel (pisahkan dengan koma untuk banyak channel): ").split(',').map(id => id.trim());
const deleteOption = readline.question("Ingin menghapus pesan setelah dikirim? (yes/no): ").toLowerCase() === 'yes';
const waktuKirim = parseInt(readline.question("Set Waktu Delay Kirim Pesan (dalam detik): ")) * 1000;
let waktuHapus = 0;
let waktuSetelahHapus = 0;

if (deleteOption) {
    waktuHapus = parseInt(readline.question("Set Waktu Delay Hapus Pesan (dalam detik): ")) * 1000;
    waktuSetelahHapus = parseInt(readline.question("Set Waktu Delay Setelah Hapus Pesan (dalam detik): ")) * 1000;
}

const tokens = fs.readFileSync("token.txt", "utf-8").split('\n').map(token => token.trim());

const sendMessage = async (channelId, content, token) => {
    try {
        const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
            method: 'POST',
            headers: { 'Authorization': token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });

        if (response.ok) {
            const messageData = await response.json();
            console.log(chalk.green(`[✔] Message sent to ${channelId}: ${content}`));
            if (deleteOption) {
                await new Promise(resolve => setTimeout(resolve, waktuHapus));
                await deleteMessage(channelId, messageData.id, token);
            }
            return messageData.id;
        } else if (response.status === 429) {
            const retryAfter = (await response.json()).retry_after;
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            return sendMessage(channelId, content, token);
        }
    } catch (error) {
        console.log(chalk.red("Error sending message:", error));
    }
    return null;
};

const deleteMessage = async (channelId, messageId, token) => {
    try {
        const delResponse = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages/${messageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        if (delResponse.ok) {
            console.log(chalk.blue(`[✔] Deleted message ${messageId} in channel ${channelId}`));
        }
        await new Promise(resolve => setTimeout(resolve, waktuSetelahHapus));
    } catch (error) {
        console.log(chalk.red("Error deleting message:", error));
    }
};

const listenForImages = async (channelId, token) => {
    try {
        const lastMessageId = fs.existsSync(`last_message_${channelId}.txt`) ? 
            fs.readFileSync(`last_message_${channelId}.txt`, "utf-8").trim() : null;

        const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages?limit=5`, {
            headers: { 'Authorization': token }
        });

        if (response.ok) {
            const messages = await response.json();

            for (const message of messages) {
                if (message.id === lastMessageId) break; // Hindari mendeteksi ulang pesan lama

                if (message.attachments && message.attachments.length > 0) {
                    console.log(chalk.yellow(`[!] Image detected in channel ${channelId}`));
                    await sendMessage(channelId, "cat", token);
                    break; // Hanya kirim satu kali untuk setiap batch pengecekan
                }
            }

            if (messages.length > 0) {
                fs.writeFileSync(`last_message_${channelId}.txt`, messages[0].id); // Simpan ID pesan terbaru
            }
        }
    } catch (error) {
        console.log(chalk.red("Error in image detection:", error));
    }
};

(async () => {
    while (true) {
        for (const token of tokens) {
            for (const channelId of channelIds) {
                await listenForImages(channelId, token);
                await new Promise(resolve => setTimeout(resolve, waktuKirim));
            }
        }
    }
})();
