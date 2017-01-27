const loadCommand = (command) => require(`../${command}.js`)
const rssConfig = require('../../config.json')
const commandList = require('../../util/commandList.json')

module.exports = function (bot, message, isCallingCmd, command, callback) {
  if (commandList[command] != null) var commandFile = commandList[command].file
  var rssList = []
  try {rssList = require(`../../sources/${message.guild.id}.json`).sources} catch(e) {}

  var embed = {embed: {
    color: rssConfig.menuColor,
    description: `**Channel:** #${message.channel.name}\n**Server Limit:** ${rssList.length}/${rssConfig.maxFeeds}\n`,
    author: {name: `Active Feeds for Current Channel`},
    fields: [],
    footer: {}
  }}

  function isCurrentChannel(channel) {
    if (isNaN(parseInt(channel,10))) {
      if (message.channel.name == channel) return true;
      else return false;
    }
    else {
      if (message.channel.id == channel) return true;
      else return false;
    }
  }

  var currentRSSList = [];
  for (var rssIndex in rssList){
    if (isCurrentChannel(rssList[rssIndex].channel)) currentRSSList.push( [rssList[rssIndex].link, rssIndex, rssList[rssIndex].title] );
  }


  if (currentRSSList.length <= 0) {
    return message.channel.sendMessage("No feeds assigned to this channel.");
  }

  else {
    let returnMsg = "```Markdown\n# Feeds assigned to this channel: ``````Markdown\n"
    for (var x in currentRSSList) {
      let count = parseInt(x,10) + 1;
      returnMsg += `[${count}]: ${currentRSSList[x][0]}\n`
      if (isCallingCmd) {
        embed.embed.fields.push({
          name: `${count})  ${currentRSSList[x][2]}`,
          value: "Link: " + currentRSSList[x][0]
        })
      }
      else {
        embed.embed.fields.push({
          name: `${currentRSSList[x][2]}`,
          value: "Link: " + currentRSSList[x][0]
        })
      }
    }

    if (isCallingCmd) {
      embed.embed.author.name = "Feed Selection Menu";
      embed.embed.description += `**Action**: ${commandList[command].action}\n\nChoose a feed to from this channel by typing the number to execute your requested action on. Type **exit** to cancel.\n_____`;
      message.channel.sendMessage("",embed);
    }
    else {
      embed.embed.description += `_____`;
      return message.channel.sendMessage("",embed);
    }

    const filter = m => m.author.id == message.author.id;
    const collector = message.channel.createCollector(filter,{time:60000});


    collector.on('message', function (m) {
      if (m.content.toLowerCase() == "exit") return collector.stop("RSS Feed selection menu closed.");
      let index = parseInt(m,10) - 1;

      if (isNaN(index) || m > currentRSSList.length) return message.channel.sendMessage("That is not a valid number.");
      else {
        collector.stop();
        let rssIndex = currentRSSList[index][1];
        if (!commandList[command].specialCmd) loadCommand(commandFile)(message, rssIndex);
        else callback(rssIndex);
      }
    })
    collector.on('end', (collected, reason) => {
      if (reason == "time") return message.channel.sendMessage(`I have closed the menu due to inactivity.`);
      else if (reason !== "user") return message.channel.sendMessage(reason);
    })
  }
}
