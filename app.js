/*global d3*/
d3.json('/you-are-what-you-eat/data.json', function(error, data) {
    // var user = data[+window.qual];
    var user = data[48220]

    d3.select('.loading').remove();

    var squareWidth = 16,
      squareBorderWidth = 2,
      weeks = 25;
    var colors = [
      'steelblue', // Match
      'rgb(167, 198, 223)', // Partial match
      'rgb(255, 229, 233)', // No match
      'rgb(239, 239, 239)' // Did not order
    ];
    var tooltipText = ['Identical', 'Similar', 'Different'];

    var squares;
    var title;
    var calendar;
    var info;
    var mungingData;

    function getYYYYMMDD(date, delim) {
      return [date.getFullYear(), ('0' + (date.getMonth() + 1)).slice(-2), ('0' + date.getDate()).slice(-2)].join(delim);
    }

    function getPreviousMonday(daysBack) {
      // var monday = new Date();
      var monday = new Date(1540930989393); // 10/30/2018
      monday.setDate(monday.getDate() - daysBack);
      if (monday.getDay() > 1) {
        monday.setDate(monday.getDate() - monday.getDay() + 1);
      } else if (monday.getDay() === 0) {
        monday.setDate(-6);
      }
      return monday;
    }

    function getPercentSimilar(scores) {
      var IS = scores[0],
        SS = scores[1],
        DS = scores[2];
      return Math.round((IS + SS) / (IS + SS + DS) * 1000) / 10;
    }

    function getPercentDissimilar(scores) {
      return 1 - getPercentSimilar(scores);
    }

    function generateMatchText(match) {
      var text = {
        Not: [
          'Your orders were not similar.',
          "You just weren't feeling each other that day.",
          "Not gonna lie, this wasn't even close.",
          'Must have been opposite day or something...',
          'One of you made the wrong call.',
          'Independence is a virtue.',
          'Just apples and oranges that day.',
          'Well, maybe your shirts matched...?'
        ]
      };
      return text[match][Math.floor(Math.random() * text[match].length)];
    }

    function munge(you, other) {
      var munged = [];
      var today = new Date();
      var curDate = getPreviousMonday(7 * weeks); // 25 weeks back
      var dateStr, yourOrder, otherOrder;
      var tagScore = 0;
      var dissimilarityScore = 0;
      var similarityScore = 0;
      var identityScore = 0;
      var matchableDays = 0;
      while (curDate <= today) {
        if (curDate.getDay() > 0 && curDate.getDay() < 6) {
          dateStr = getYYYYMMDD(curDate, '-');
          yourOrder = you.orders[dateStr];
          otherOrder = other.orders[dateStr];
          if (yourOrder && otherOrder) {
            matchableDays++;
            tagScore = (d3.sum(yourOrder.tags.map(function(x) { return otherOrder.tags.indexOf(x) >= 0 ? 1 : 0; })) / yourOrder.tags.length) || 0;
            if (yourOrder.itemId === otherOrder.itemId) {
              munged.push({
                match: 'Full',
                matchText: 'You both ordered ' + otherOrder.name + '.',
                date: new Date(curDate),
                itemId: otherOrder.itemId,
                name: otherOrder.name,
                tags: otherOrder.tags
              });
              identityScore++;
            } else if (yourOrder.restaurantId === otherOrder.restaurantId) {
              munged.push({
                match: 'Partial',
                matchText: 'You both ordered from ' + otherOrder.restaurantName + '.',
                date: new Date(curDate),
                itemId: otherOrder.itemId,
                name: otherOrder.name,
                tags: otherOrder.tags
              });
              similarityScore++;
            } else if (tagScore) {
              munged.push({
                match: 'Partial',
                matchText: 'You both ordered ' + otherOrder.tags.join('/') + '.',
                date: new Date(curDate),
                itemId: otherOrder.itemId,
                name: otherOrder.name,
                tags: otherOrder.tags
              });
              similarityScore++;
            } else {
              munged.push({
                match: 'Not',
                matchText: generateMatchText('Not'),
                date: new Date(curDate),
                itemId: otherOrder ? otherOrder.itemId : null,
                name: otherOrder ? otherOrder.name : null,
                tags: otherOrder ? otherOrder.tags : []
              });
              dissimilarityScore++;
            }
          } else {
            munged.push({
              match: 'No Order',
              matchText: 'One of you did not order.',
              date: new Date(curDate),
              itemId: otherOrder ? otherOrder.itemId : null,
              name: otherOrder ? otherOrder.name : null,
              tags: otherOrder ? otherOrder.tags : []
            });
          }
        }
        curDate.setDate(curDate.getDate() + 1);
      }
      return {
        data: munged,
        scores: [
          identityScore / matchableDays,
          similarityScore / matchableDays,
          dissimilarityScore / matchableDays
        ]
      };
    }

    mungingData = Object.keys(data).map(function(x) {
      var munged = munge(user, data[x]);
      return {
        name: data[x].name,
        data: munged.data,
        scores: munged.scores
      };
    }).sort(function(a, b) {
      var aScore = getPercentSimilar(a.scores),
        bScore = getPercentSimilar(b.scores);
      return aScore <= bScore ? (aScore == bScore ? 0 : 1) : -1;
    }).sort(function(a, b) {
      var aScore = getPercentSimilar(a.scores),
        bScore = getPercentSimilar(b.scores);
      return aScore <= bScore ? (aScore == bScore ? 0 : 1) : -1;
    }); // have to do this twice for some reason!?


    var mungedData = [];
    var booleanArray;
    var matchableOrders;

    for (var i = 0; i < mungingData.length; i++) {
      if (mungingData[i].name == user.name && mungingData[i].scores[0] == 1) {
        continue; // Do not show yourself
      }
      matchableOrders = 0;
      booleanArray = mungingData[i].data.map(function(x) { return x.match != 'No Order' ? 1 : 0; });
      // For some reason I can't reduce booleanArray so I will manually loop
      for (var j = 0; j < booleanArray.length; j++) {
        matchableOrders += booleanArray[j];
      }
      if (matchableOrders >= 18) {
        mungedData.push(mungingData[i]);
      }
    }

    //mungedData = mungedData.slice(1); // Do not show yourself

    var calendarWidth = squareWidth * (weeks + 1) + squareBorderWidth * (weeks + 2),
      calendarHeight = squareWidth * 5 + squareBorderWidth * 6,
      calendarMarginY = squareWidth,
      infoWidth = calendarWidth,
      infoHeight = 40,
      titleHeight = 40,
      titleWidth = calendarWidth,
      dayLegendWidth = squareWidth + squareBorderWidth,
      subChartHeight = titleHeight + calendarHeight + infoHeight + calendarMarginY,
      subChartWidth = dayLegendWidth + calendarWidth,
      chartWidth = subChartWidth,
      chartHeight = subChartHeight * mungedData.length;

    var y = d3.scale.ordinal()
      .domain(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
      .rangeBands([0, calendarHeight]);

    /*
    var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");
    */

    var chart = d3.select('.chart')
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .attr('transform', 'translate(0, 0)');

    /*
    chart.append("g")
      .attr("class", "y axis")
      .call(yAxis);
    */

    chart.selectAll('g')
      .data(mungedData)
      .enter()
      .append('g')
        .attr('transform', function(d, i) {
          return 'translate(' + squareBorderWidth + ',' + ((subChartHeight) * i) + ')';
        })
        .append('svg')
          .attr('class', function(d, i) {
            return 'calendar' + i;
          });

    var percentBar;
    var currentData;
    var dayLegend;

    for (i = 0; i < mungedData.length; i++) {
      currentData = mungedData[i];
      calendar = d3.select('.calendar' + i);

      title = calendar.append('g')
        .attr('width', titleWidth)
        .attr('height', titleHeight)
        .attr('class', 'title')
        .attr('transform', 'translate(' + dayLegendWidth + ', 21)');

      title.append('text')
        .attr('class', 'name')
        .attr('fill', '#464646')
        .text(mungedData[i].name);

      percentBar = title.append('g')
        .attr('transform', 'translate(0, 6)');

      percentBar.selectAll('rect')
        .data(currentData.scores)
        .enter()
        .append('rect')
          .attr('x', function(d, i) {
            var shift = 0;
            while (--i >= 0) {
              shift += currentData.scores[i] * (calendarWidth - squareBorderWidth * 2);
            }
            return shift;
          })
          .attr('height', 6)
          .attr('width', function(d) {
            return d * (calendarWidth - squareBorderWidth * 2);
          })
          .attr('fill', function(d, i) { return colors[i]; })
          .attr('class', 'percent-bar')
          .on('mouseover', function(d, i) {
            var barPosition = this.getBoundingClientRect();
            d3.select('.percent-bar-tooltip')
              .style('visibility', 'visible')
              .style('left', (window.pageXOffset + (barPosition.left + barPosition.right) / 2) + 'px')
              .style('top', (window.pageYOffset + barPosition.top) + 'px')
              .html((Math.floor(d * 1000) / 10) + '% ' + tooltipText[i]);
            for (var j = 0; j < tooltipText.length; j++) {
              if (i != j) {
                d3.select(this.parentNode.parentNode.parentNode).selectAll('.' + tooltipText[j].toLowerCase())
                  .style('fill', colors[3]);
              }
            }
          })
          .on('mouseout', function(d, i) {
            d3.select('.percent-bar-tooltip')
              .style('visibility', 'hidden');
            for (var j = 0; j < tooltipText.length; j++) {
              if (i != j) {
                d3.select(this.parentNode.parentNode.parentNode).selectAll('.' + tooltipText[j].toLowerCase())
                  .style('fill', colors[j]);
              }
            }
          });

      /*
      info.append('text')
        .attr('class', 'score')
        .attr('transform', 'translate(0,' + (squareBorderWidth + 20) + ')')
        .attr('fill', '#464646')
        .text((getPercentSimilar(mungedData[i].scores)).toString() + '%');
      */

      dayLegend = calendar.append('g')
        .attr('width', dayLegendWidth)
        .attr('transform', 'translate(0, ' + (titleHeight + 12) + ')');

      dayLegend.append('text').text('M').attr('fill', '#9c9c9c').attr('class', 'day').attr('transform', 'translate(0, 0)');
      dayLegend.append('text').text('T').attr('fill', '#9c9c9c').attr('class', 'day').attr('transform', 'translate(0, ' + (squareWidth + squareBorderWidth) + ')');
      dayLegend.append('text').text('W').attr('fill', '#9c9c9c').attr('class', 'day').attr('transform', 'translate(0, ' + ((squareWidth + squareBorderWidth) * 2) + ')');
      dayLegend.append('text').text('T').attr('fill', '#9c9c9c').attr('class', 'day').attr('transform', 'translate(0, ' + ((squareWidth + squareBorderWidth) * 3) + ')');
      dayLegend.append('text').text('F').attr('fill', '#9c9c9c').attr('class', 'day').attr('transform', 'translate(0, ' + ((squareWidth + squareBorderWidth) * 4) + ')');

      info = calendar.append('g')
        .attr('width', infoWidth)
        .attr('height', infoHeight)
        .attr('class', 'info')
        .attr('transform', 'translate(0, ' + (titleHeight + calendarHeight + 15) + ')');

      info.append('text')
        .attr('class', 'match')
        .attr('transform', 'translate(' + dayLegendWidth + ',0)')
        .attr('fill', '#9c9c9c');

      squares = calendar.append('g')
        .attr('transform', 'translate(' + dayLegendWidth + ',' + titleHeight + ')')
        .attr('class', 'squares');

      squares.selectAll('rect')
        .data(mungedData[i].data)
        .enter()
        .append('rect')
          .attr('transform', function(d, i) {
            var remainder5 = i % 5;
            return 'translate(' + (Math.floor(i / 5) * (squareWidth + squareBorderWidth)) + ',' + remainder5 * (squareWidth + squareBorderWidth) + ')';
          })
          .attr('width', squareWidth)
          .attr('height', squareWidth)
          .attr('class', function(d) {
            var returnClass = {
              Full: 'identical',
              Partial: 'similar',
              Not: 'different',
              'No Order': 'no-order'
            };
            return returnClass[d.match];
          })
          .style('fill', function(d) {
            var returnColors = {
              Full: colors[0],
              Partial: colors[1],
              Not: colors[2],
              'No Order': colors[3]
            };
            return returnColors[d.match];
          })
          .on('mouseover', function(d, i) {
            d3.select(this).style('stroke', '#464646').style('stroke-width', 2);
            d3.select(this.parentNode.parentNode).select('.match').text(d.matchText);
          })
          .on('mouseout', function(d, i) {
            d3.select(this).style('stroke', 'none').style('stroke-width', 'none');
            d3.select(this.parentNode.parentNode).select('.match').text('');
          });
    }

    d3.select('.author').style('display', 'block');
  });
