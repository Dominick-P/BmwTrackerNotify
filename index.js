require('dotenv').config();
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const fs = require('node:fs');

const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const telegramChatId = process.env.telegramChatId;

const bot = new TelegramBot(process.env.telegramToken, { polling: false });

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const checkForStatusUpdate = (async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    let lastStatus = fs.readFileSync('lastStatus', 'utf8');

    // Login to BMW site

    await page.goto('https://mygarage.bmwusa.com/');
    await page.waitForNavigation();

    await page.waitForSelector("#email");
    await page.type("#email", email);
    await page.type("#password", password);

    await page.keyboard.press('\r');

    await page.waitForSelector("a[name='trackStatus']"); // Wait for load and track button for future

    let vehicleInfo = await page.evaluate(() => { // Get vehicle info
        return sessionStorage.getItem('production-vehicles');
    });

    vehicleInfo = JSON.parse(vehicleInfo)[0];

    if (vehicleInfo.overHeadMessage == lastStatus) { // If vehicle status the same, exit
        console.log("Status has not changed.");
        browser.close();

        return;
    } else {
        fs.writeFileSync('lastStatus', vehicleInfo.overHeadMessage); // It changed so let's update the last status file
    }

    // Wait for page to finish loading with image, take screenshot, and send to telegram

    await sleep(300);
    await page.click("a[name='trackStatus']");
    await page.waitForSelector("#carousel > div.carousel-inner");

    await page.evaluate(async () => {
        let imageFrame = document.querySelector("#carousel > div.carousel-inner");

        while (imageFrame.naturalHeight === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        imageFrame.scrollIntoView();
        await new Promise(resolve => setTimeout(resolve, 100));
        imageFrame.scrollIntoView();

        return;
    });

    const pageScreenshot = await page.screenshot();

    await bot.sendPhoto(telegramChatId, pageScreenshot, { caption: `Status - ${vehicleInfo.overHeadMessage}\nProduction Date - ${vehicleInfo.prodDate}` });
    console.log("Bot has sent message.");

    await browser.close();
});

const job = schedule.scheduleJob('*/20 * * * *', function () {
    console.log("Checking for status update...");
    checkForStatusUpdate();
});

job.invoke();