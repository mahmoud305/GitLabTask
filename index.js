const puppeteer = require('puppeteer');
const fs = require("fs");
const { Cluster } = require('puppeteer-cluster');

const urls = [
    "https://twitter.com/Mr_Derivatives",
    "https://twitter.com/warrior_0719"
];

async function startCrawling  (urls,cashTag) {
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: 2,
        puppeteerOptions: {
            headless: false,
            defaultViewport: false,
        }
    });

    cluster.on('taskerror', (err, data, willRetry) => {
        if (willRetry) {
            console.warn(`Encountered an error while crawling ${data}. ${err.message}\nThis job will be retried`);
        } else {
            console.error(`Failed to crawl ${data}: ${err.message}`);
        }
    });
    await cluster.task(async ({ page, data: url }) => {
        // const cashTag = "TSLA";
        try {
            await page.goto(url, { timeout: 60000, waitUntil: 'networkidle2' });
            const tweets = await fetchingTweetes(page);// get the tweets
            await saveTweets(url, tweets);// save the tweets to file
            const cashTagCount = countStockMentions(tweets, cashTag);
           await  writingStatistics(url, cashTag, cashTagCount);
        } catch (error) {
            console.error(`Error fetching the Twitter page:${url} where: ${error.message}`);
        }
    });

    for (const url of urls) {
        cluster.queue(url);
    }



    // close cluster and browswer
    await cluster.idle();
    await cluster.close();
}

const writingStatistics = async (url, cashTag, cashTagCount) => {
    const obj = { cashTag, cashTagCount, date: getCurrentDateTime() };
    console.log(obj);
    try {
        await fs.readFile('results.json','utf-8', async function (err, data) {
            // console.log(err);
            // console.log(data);
            var userStatistics = JSON.parse(data);
            const record = userStatistics.find(row=> row.url === url);
            // console.log("obj ");
            // console.log(record);
            if(record){
                record.statistics.push(obj);
            }else{
                userStatistics.push({url,statistics:[obj]});
            }
           
            await fs.writeFileSync("results.json", JSON.stringify(userStatistics))
        })

    } catch (error) {
        console.log("error in writing statistics ", error);
    }

}

function getCurrentDateTime() {// function to get the current date
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');

    return {
        year,
        month,
        day,
        hour,
        minute,
        second
    };
}
function countCashtagOccurrences(text, word) {// function to check how many times a tweet contains the word
    // Create a regular expression to match all occurrences of the word starting with $ followed by the specific word
    const regex = new RegExp(`\\$${word}\\b`, 'gi'); // 'g' for global, 'i' for case-insensitive
    const matches = text.match(regex);
    return matches ? matches.length : 0;
}

function countStockMentions(tweets, stockSymbol) {
    let count = 0;
    for (var tweet of tweets) {
        console.log("HELLLLLLLLLLLLLLLLO");
        console.log(tweet.text);
        count += countCashtagOccurrences(tweet.text, stockSymbol);
    };
    return count;
}
async function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}
async function saveTweets(url, tweets) {
    const userName = url.split("com/")[1];
    await fs.writeFileSync(`${userName}.json`, JSON.stringify(tweets));
}
async function fetchingTweetes(page) {
    let tweets = [];
    let attempts = 1;
    while (tweets.length < 25) {
        await page.waitForSelector('div[data-testid="tweetText"]', { timeout: 60000 });
        const newTweets = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('div[data-testid="tweetText"]'))
                .map((tweet, index) => ({ text: tweet.innerText }));
        });
        tweets = tweets.concat(newTweets);
        await page.evaluate(async () => {
            const lastTweet = document.querySelectorAll('div[data-testid="cellInnerDiv"]');
            if (lastTweet.length > 0) {
                console.log("Hellllllo");
                console.log(lastTweet);
                lastTweet[lastTweet.length - 1].scrollIntoView();
            }
        });
        await delay(3000);
    }
    return tweets;

}



(async()=>{ // main function 
    const args = process.argv.slice(2);// remove unwanted arg
    const urls = args.slice(0, 10);
    const cashTag= String(args[args.length - 1]);
    console.log(args);
    console.log(urls)
    console.log(cashTag);
    await startCrawling(urls,cashTag);

})();

/*
[
    {
        url:
            [
                {
                    query: #numberof times,
                    date
                }

            ]
    },

]
*/