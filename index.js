'use strict';

var Base = require('mocha/lib/reporters/base'),
  cursor = Base.cursor,
  color = Base.color,
  driver = require('api-driver').emitter,
  fs = require('fs');

exports = module.exports = Scribe;

/**
 * Initialize a new `Spec` test reporter.
 *
 * @param {Runner} runner
 * @api public
 */

var outDir = process.env.SCRIBE_DIR;

function Scribe(runner) {
  Base.call(this, runner);

  var self = this,
    suites = [],
    tests,
    testTranscript,
    step,
    index = [],
    n = 0,
    inHook;

  function indent() {
    return Array(suites.length).join('  ');
  }

  runner.on('start', function(){
    console.log();
  });

  runner.on('suite', function(suite){
    if (suites.length === 0) {
      suites.push({});
      return;
    }
    var suiteTranscript = {
      what: 'stories',
      description: suite.title,
      stories: []
    };
    suites.push(suiteTranscript);
    tests = suiteTranscript.stories;
    console.log(color('suite', '%s%s'), indent(), suite.title);
  });

  runner.on('hook', function() {
    inHook = true;
  });

  runner.on('hook end', function() {
    inHook = false;
  });

  runner.on('test', function(test){
    var transcript = {
      description: test.title,
      steps: []
    };
    tests.push(transcript);
    testTranscript = transcript;
  });

  runner.on('suite end', function(){
    var suiteTranscript = suites.pop();
    if (1 === suites.length) {
      var outFile = suiteTranscript.description.replace(/ /g, '_') + '.json';
      fs.writeFileSync(outDir + '/' + outFile, JSON.stringify(suiteTranscript, null, 4));
      index.push({file: outFile, desc: suiteTranscript.description});
    }
  });

  runner.on('pending', function(test){
    var fmt = indent() + color('pending', '  - %s');
    console.log(fmt, test.title);
  });

  runner.on('pass', function(test){
    var fmt;
    if ('fast' === test.speed) {
      fmt = indent()
        + color('checkmark', '  ' + Base.symbols.ok)
        + color('pass', ' %s ');
      cursor.CR();
      console.log(fmt, test.title);
    } else {
      fmt = indent()
        + color('checkmark', '  ' + Base.symbols.ok)
        + color('pass', ' %s ')
        + color(test.speed, '(%dms)');
      cursor.CR();
      console.log(fmt, test.title, test.duration);
    }
  });

  runner.on('fail', function(test){
    cursor.CR();
    console.log(indent() + color('fail', '  %d) %s'), ++n, test.title);
  });

  runner.on('end', function() {
    fs.writeFileSync(outDir + '/index.json', JSON.stringify({transcripts: index}, null, 4));
    self.epilogue();
  });

  //
  // Handle driver events
  //
  driver.on('step', function(title) {
    step = {
      description: title,
      depth: 0,
      docStrings: {},
      actions: []
    };
    testTranscript.steps.push(step);
  });

  driver.on('request end', function(actor, req, res) {
    if (!testTranscript || inHook) return;
    if (testTranscript.steps.length === 0) {
      testTranscript.steps.push({
        description: '$body$',
        depth: 0,
        docStrings: {},
        actions: []
      });
      step = testTranscript.steps[0];
    }
    var action = {};
    step.actions.push(action);
    action.actor = actor;
    action.request = {
      method: req.method,
      body: req.body,
      path: req.relativeUrl,
      headers: req.headers
    };
    action.response = {
      statusCode : res && res.statusCode,
      body : res.body
    };
  });


}

/**
 * Inherit from `Base.prototype`.
 */

Scribe.prototype.__proto__ = Base.prototype;
