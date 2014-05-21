/*\
title: $:/plugins/kpe/githubsync/githubsyncadaptor.js
type: application/javascript
module-type: syncadaptor

A sync adaptor module for GitHub.

\*/

/**
 * File: githubsyncadaptor.js
 * Created by kpe on 21-May-2014 at 4:19 PM.
 */
(function () {
	/*jslint node:true, browser:true */
	/*global $tw: false*/
	'use strict';

	var CONFIG_REPO_TIDDLER = "$:/config/githubsync/repo";
	var DEFAULT_REPO_TIDDLER = "$username/$repo";

	/**
	 *
	 * @param syncer
	 * @constructor
	 */
	function GitHubAdaptor(syncer) {
		this.syncer = syncer;
		this.repo = this.getRepo();
		this.recipe = undefined;
		this.logger = new $tw.utils.Logger("GitHubAdaptor");
	}

	GitHubAdaptor.prototype.getRepo = function () {
		var result = null;
		var text = this.syncer.wiki.getTiddlerText(CONFIG_REPO_TIDDLER, DEFAULT_REPO_TIDDLER);
		var match = /(\w+)+\/(\w+)+]/.exec(text);
		if(match) {
			result = {username: match[1], repo: match[2]};
		} else {
			result = {username: 'kpe', repo: 'test'};
		}
		return result;
	};

	GitHubAdaptor.prototype.getTiddlerInfo = function (tiddler) {
		return {
			bag: tiddler.fields["bag"]
		};
	};

	/**
	 * Get the current status of the GitHub connection
	 */
	GitHubAdaptor.prototype.getStatus = function (callback) {
		var self = this;
		var wiki = self.syncer.wiki;
		var githubAToken = null;
		if(localStorage){
			githubAToken = localStorage['githubsync-access-token'];
		}
		if(!githubAToken) {
			throw new Error('No GitHub Access Token available.');
		}

		this.logger.log('Testing GitHub Connection');

		var Github = require('$:/plugins/kpe/githubsync/lib/github.js');

		var github = new Github({auth:'oauth', token: githubAToken});
		var repo = github.getRepo(this.repo.username, this.repo.repo);
		repo.show(function(err, repo){
			if(err) {
				console.error('error accessing repo',err);
				return callback(err);
			}
			console.log('repo',repo);
			var isLoggedIn = true;
			if(callback) {
				callback(null, isLoggedIn, self.repo.username);
			}
		});
	};

GitHubAdaptor.prototype.login = function (username, password, callback) {
	console.error('About to log in with GitHub');
};
GitHubAdaptor.prototype.logout = function (callback) {

};

GitHubAdaptor.prototype.getSkinnyTiddlers = function (callback) {

};
GitHubAdaptor.prototype.saveTiddler = function (callback) {

};
GitHubAdaptor.prototype.loadTiddler = function (callback) {

};
GitHubAdaptor.prototype.deleteTiddler = function (callback) {

};

if($tw.browser && document.location.protocol.substr(0,4) === "http" ) {
	exports.adaptorClass = GitHubAdaptor;
}

})();
