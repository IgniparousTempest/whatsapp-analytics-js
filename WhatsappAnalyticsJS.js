function processMessages(text) {
    // WhatsApp in all their wisdom has different formats for log files from different devices
    // Android RegEx
    const androidRegEx = /^(\d{4}\/\d{2}\/\d{2}), (\d{2}:\d{2}) - (([^\n]*?): )?(.+?(?=(\d{4}\/\d{2}\/\d{2}, \d{2}:\d{2} - )|(?!.)))/gusm;
    // iOS RegEx
    const iosRegEx = /^\[(\d{4}\/\d{2}\/\d{2}), (\d{2}:\d{2}):\d{2}\] (([^\n]*?): )?(.+?(?=(\[\d{4}\/\d{2}\/\d{2}, \d{2}:\d{2}:\d{2}\])|(?!.)))/gusm;

    let regex = androidRegEx;
    let messages = [];
    for (let i = 0; i < 2; i++) {
        while (true) {
            const match = regex.exec(text);
            if (match === null)
                break;
            messages.push({date: match[1], time: match[2], name: match[4], message: match[5]});
        }
        if (messages.length === 0)
            regex = iosRegEx;
    }

    return messages;
}

// Counts the number of messages sent by each participant.
// Returns a dictionary containing a name and the number of messages sent.
function messageFrequency(messages) {
    let frequency = {};
    for (let i = 0; i < messages.length; i++) {
        if (typeof messages[i].name !== "undefined") {
            if (messages[i].name in frequency)
                frequency[messages[i].name] += 1;
            else
                frequency[messages[i].name] = 1;
        }
    }
    return frequency;
}

// Gets the names of the two participants in the conversation.
function getCorrespondentsNames(frequency, getAll = false) {
    let names = Object.keys(frequency).map(function(key) {return key;});
    if (getAll || names.length === 2)
        return names;
    else if (names.length >= 2)
        throw "There were too many participants in the conversation log (expected 2, got "+names.length+")?";
    else
        throw "There were too few participants in the conversation log (expected 2, got "+names.length+")?";
}

// Constructs a dictionary with the names of the participants as keys, and 0 as the values.
function countDictionary(names) {
    let dict = {};
    for (let i = 0; i < names.length; i++)
	dict[names[i]] = 0;
    return dict;
}

// Gets the number of messages sent by each participant.
function messageCount(messages, names) {
    let numMessages = countDictionary(names);

    for (let i = 0; i < messages.length; i++) {
        if (names.includes(messages[i].name))
            numMessages[messages[i].name]++;
    }

    return numMessages;
}

// Counts the number of words sent by each participant.
function wordCount(messages, names) {
    let numWords = countDictionary(names);

    for (let i = 0; i < messages.length; i++) {
        if (names.includes(messages[i].name) && !isMedia(messages[i].message) && !isLocation(messages[i].message))
            numWords[messages[i].name] += messages[i].message.split(' ').length;
    }

    return numWords;
}

// Counts the number of words sent by each participant.
function longestMessage(messages, names) {
    let longestMessage = countDictionary(names);

    for (let i = 0; i < messages.length; i++) {
        if (names.includes(messages[i].name))
            if (longestMessage[messages[i].name] < messages[i].message.split(' ').length)
                longestMessage[messages[i].name] = messages[i].message.split(' ').length;
    }

    return longestMessage;
}

// Counts the number of words sent by each participant.
function wordsPerMessage(numMessages, numWords, names) {
    let wpm = {};
    for (let i = 0; i < names.length; i++) {
	wpm[names[i]] = numWords[names[i]] / numMessages[names[i]];
    }
    return wpm;
}

// Counts the longest message streak for each participant.
function messageStreak(messages, names) {
    let streak = countDictionary(names);
    let current = countDictionary(names);
    let previous = null;

    for (let i = 0; i < messages.length; i++) {
        if (names.includes(messages[i].name)) {
            if (previous === messages[i].name)
                current[messages[i].name] += 1;
            else {
                current[messages[i].name] = 1;
                if (previous !== null && current[previous] > streak[previous])
                    streak[previous] = current[previous];
                previous = messages[i].name;
            }
        }
    }

    return streak;
}

// The number of messages on each day of the week.
function messageDayOfWeek(messages, names) {
    let week = {};
    for (let i = 0; i < names.length; i++)
	week[names[i]] = [0, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i < messages.length; i++) {
        if (names.includes(messages[i].name))
            week[messages[i].name][new Date(Date.parse(messages[i].date)).getDay()] += 1;
    }

    let data = {};
    for (let i = 0; i < names.length; i++)
	data[names[i]] = {monday: week[names[i]][1], tuesday: week[names[i]][2], wednesday: week[names[i]][3], thursday: week[names[i]][4], friday: week[names[i]][5], saturday: week[names[i]][6], sunday: week[names[i]][0]};
    return data;
}

// The number of messages per 15 minute interval.
// Add up every 2 elements in the array to get 30 minute intervals, and so on.
function messageTime(messages, names) {
    let times = {};
    for (let i = 0; i < names.length; i++)
	times[names[i]] = Array.from({length: 24 * 4}, (v, i) => 0);

    for (let i = 0; i < messages.length; i++) {
        if (names.includes(messages[i].name)) {
            let timeStr = messages[i].time.split(':');
            let minutes = parseInt(timeStr[0]) * 60 + parseInt(timeStr[1]);
            let index = Math.floor(minutes / 15);
            if (index >= 24 * 4)
                index = 24 * 4 - 1;
            times[messages[i].name][index] += 1;
        }
    }

    return times;
}

// Counts the number of each emoji sent by each participant.
function emojiCount(messages, names) {
    let emojis = {};
    for (let i = 0; i < names.length; i++)
        emojis[names[i]] = {};
    let regex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;

    for (let i = 0; i < messages.length; i++) {
        if (names.includes(messages[i].name))
            while (true) {
                const match = regex.exec(messages[i].message);
                // No more matches
                if (match === null)
                    break;
                // Ignore the fitzpatrick modifiers.
                if (match[0] === '🏻' || match[0] === '🏼' || match[0] === '🏽' || match[0] === '🏾' || match[0] === '🏿')
                    continue;
                // Add emoji to dict
                if (match[0] in emojis[messages[i].name])
                    emojis[messages[i].name][match[0]] += 1;
                else
                    emojis[messages[i].name][match[0]] = 1;
		    }
    }

    return emojis;
}

// Counts the total number of emojis sent by each participant.
function emojiTotal(emojis, names) {
    let total = countDictionary(names);
    
    for (let i = 0; i < names.length; i++) {
        total[names[i]] = Object.values(emojis[names[i]]).reduce((a, b) => a + b, 0);
    }

    return total;
}

// Calculates the average happiness of the conversation by the types of emoji sent.
function emojiAverageHappiness(emojis, names) {
    let happiness = {};
    for (let i = 0; i < names.length; i++)
        happiness[names[i]] = {happy: 0, sad: 0};
    
    for (let i = 0; i < names.length; i++) {
        for (key in emojis[names[i]]) {
            if ("😀😁😂😃😄😆😊😍😘😗😙😚☺️🙂🤗❤️".includes(key))
                happiness[names[i]].happy += emojis[names[i]][key];
            else if ("💔😡😠😢😭😞😟🙁☹️".includes(key))
                happiness[names[i]].sad += emojis[names[i]][key];
	}
    }
    
    for (let i = 0; i < names.length; i++) {
        if (happiness[names[i]].happy + happiness[names[i]].sad === 0)
	    happiness[names[i]] = 0.5;
        else
	    happiness[names[i]] = happiness[names[i]].happy / (happiness[names[i]].happy + happiness[names[i]].sad);
    }

    return happiness;
}

// Tries to guess the skin colour of each participant.
function skinColour(messages, names) {
    let colours = {};
    for (let i = 0; i < names.length; i++)
	colours[names[i]] = {'🏻': 0, '🏼': 0, '🏽': 0, '🏾': 0, '🏿': 0}

    for (let i = 0; i < messages.length; i++) {
        if (names.includes(messages[i].name)) {
            colours[messages[i].name]['🏻'] += (messages[i].message.match(/🏻/g) || []).length;
            colours[messages[i].name]['🏼'] += (messages[i].message.match(/🏼/g) || []).length;
            colours[messages[i].name]['🏽'] += (messages[i].message.match(/🏽/g) || []).length;
            colours[messages[i].name]['🏾'] += (messages[i].message.match(/🏾/g) || []).length;
            colours[messages[i].name]['🏿'] += (messages[i].message.match(/🏿/g) || []).length;
        }
    }

    for (let i = 0; i < names.length; i++) {
        const cols = colours[names[i]]
        const col = Object.keys(cols).reduce((a, b) => cols[a] > cols[b] ? a : b);
        if (cols[col] === 0)
            colours[names[i]] = {colour: "Unknown", confidence: 1.0};
        else
            colours[names[i]] = {colour: col, confidence: cols[col] / Object.values(cols).reduce((a, b) => a + b)};
    }

    return colours;
}

// Calculates the number of media messages sent by each participant.
function mediaMessageCount(messages, names) {
    let numMedia = countDictionary(names);

    for (let i = 0; i < messages.length; i++) {
        if (names.includes(messages[i].name) && isMedia(messages[i].message))
            numMedia[messages[i].name] += 1;
    }

    return numMedia;
}

// Calculates the number of locations sent by each participant.
function locationMessageCount(messages, names) {
    let numLocation = countDictionary(names);

    for (let i = 0; i < messages.length; i++) {
        if (names.includes(messages[i].name) && isLocation(messages[i].message))
            numLocation[messages[i].name] += 1;
    }

    return numLocation;
}

function isMedia(message) {
    return message === "<Media omitted>\n";
}

function isLocation(message) {
    return message.includes("location: https://maps.google.com");
}
