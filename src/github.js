/**
 * File: github.js
 * Created by kpe on 22-May-2014 at 2:26 PM.
 */

(function(){
    /*jslint node:false, browser:true */
    /*global $tw: false*/
    'use strict';

    var API_URL = 'https://api.github.com';

    var Base64 = {
        keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
        /**
         * Encodes a string in base64
         * @param {String} input The string to encode in base64.
         */
        encode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;

            do {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }

                output = output +
                    Base64.keyStr.charAt(enc1) +
                    Base64.keyStr.charAt(enc2) +
                    Base64.keyStr.charAt(enc3) +
                    Base64.keyStr.charAt(enc4);
            } while (i < input.length);

            return output;
        },

        /**
         * Decodes a base64 string.
         * @param {String} input The string to decode.
         */
        decode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;

            // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

            do {
                enc1 = Base64.keyStr.indexOf(input.charAt(i++));
                enc2 = Base64.keyStr.indexOf(input.charAt(i++));
                enc3 = Base64.keyStr.indexOf(input.charAt(i++));
                enc4 = Base64.keyStr.indexOf(input.charAt(i++));

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                output = output + String.fromCharCode(chr1);

                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }
            } while (i < input.length);

            return output;
        }
    };

    var _tw_request = function(options) {
        var type = options.type || "GET",
            headers = options.headers || {accept: "application/json"},
            request = new XMLHttpRequest(),
            data = "",
            results;

console.log('>>_tw_request:',options);

        if(options.data) {
            if(typeof options.data == 'string') {
                data = options.data;
            } else {
                data = JSON.stringify(options.data);
            }
        }
        if(!options.raw) {
            request.responseType = 'json';
        }

        // Set up the state change handler
        request.onreadystatechange = function() {
            if(this.readyState == XMLHttpRequest.DONE) {
                if(this.status - this.status%100 == 200) { // if 2xx
                    var cb = options.callback;
                    if(this.responseType == 'text' || this.responseType == "") {
                        cb(null, this.responseText,this);
                    } else if(this.responseType == 'json') {
                        cb(null, this.response,this);
                    } else {
                        console.error('unexpected response', this.responseType);
                        cb(null,null,this);
                    }
                    return;
                }
                // Something went wrong
                options.callback("XMLHttpRequest error code: " + this.status);
            }
        };
        // Make the request
        request.open(type,options.url,true);
        if(headers) {
            for(var header in headers) {
                if(headers.hasOwnProperty(header)) {
                    request.setRequestHeader(header, headers[header])
                }
            }
        }

        request.send(data);
        return request;
    };


    /**
     * @param {{username:string,password:string,auth:string}|{token:string,auth:string}} opts
     */
    function authHeaders(opts) {
        var result = {
            'Accept': 'application/vnd.github.raw+json',
            'Content-Type': 'application/json;charset=UTF-8'
        };
        if (opts.token) {
            result['Authorization'] = 'token ' + opts.token;
        } else if(opts.username && opts.password) {
            result['Authorization'] = 'Basic ' + Base64.encode(opts.username + ':' + opts.password);
        }
        return result;
    }
    function extend(base, sup) {
        for(var prop in sup) {
            if(sup.hasOwnProperty(prop)) {
                if(sup[prop] === null) {
                    if(typeof base[prop] != 'undefined') {
                        delete base[prop];
                    }
                } else if () {

                } else if(typeof sup[prop] != 'object') {
                    base[prop] = sup[prop];
                } else {
                    if(typeof base[prop] == 'undefined') {
                        base[prop] = {};
                    }
                    extend(base[prop], sup[prop]);
                }
            }
        }
        return base;
    }
    function getGitHubURL(path) {
        var url = path.indexOf('//') >= 0 ? path : API_URL + path;
        return url + (/\?/.test(url) ? "&" : "?") + (new Date()).getTime();
    }

    /**
     * @param {{username:string,password:string,auth:string}|{token:string,auth:string}} opts
     * @constructor
     */
    function Github(opts){
        this.authHeaders = authHeaders(opts);
    }


    Github.prototype._request = function(method,url,data,cb,opts) {
        console.log('>>_request:',method,url,data,opts,this.authHeaders,this);
        var ropts = extend(extend({
            type: method,
            url: getGitHubURL(url)
        }, {
            headers: this.authHeaders,
            callback: cb,
            data: data
        }), opts);

        _tw_request(ropts);
    };
    Github.prototype.getRepo = function(user,repo){
        return new Repo({user:user, name:repo},this);
    };

    /**
     * @param {{user:string,name:string}} opts
     * @param {Github} github
     * @constructor
     */
    function Repo(opts,github) {
        this._github = github;
        this.user = opts.user;
        this.repo = opts.name;
        this.repoPath = "/repos/" + this.user + "/" + this.repo;

        this.currentTree = {
            "branch": null,
            "sha": null
        };
    }
    Repo.prototype._request = function(method,path,data,cb,opts){
        return this._github._request(method,this.repoPath + path, data == null? null : data, cb, opts);
    };

    Repo.prototype._updateTree = function(branch, cb) {
        if (branch === this.currentTree.branch && this.currentTree.sha) return cb(null, this.currentTree.sha);
        var self = this;
        this.getRef("heads/"+branch, function(err, sha) {
            self.currentTree.branch = branch;
            self.currentTree.sha = sha;
            cb(err, sha);
        });
    };

    Repo.prototype.getRef = function(ref, cb) {
        this._request('GET', "/git/refs/" + ref, null, function(err,res){
            if(err) return cb(err);
            cb(null, res.object.sha);
        });
    };
    Repo.prototype.listBranches = function(cb) {
        this._request("GET", "/git/refs/heads", null, function(err, heads) {
            if (err) return cb(err);
            cb(null, heads.map(function(head) {
                var parts = head.ref.split('/');
                return parts[parts.length - 1];
            }));
        });
    };
    Repo.prototype.getBlob = function(sha, cb) {
        this._request("GET", "/git/blobs/" + sha, null, cb, {raw: true});
    };

    Repo.prototype.getSha = function(branch, path, cb) {
        // Just use head if path is empty
        if (!path || path === "") return this.getRef("heads/"+branch, cb);
        this.getTree(branch+"?recursive=true", function(err, tree) {
          if (err) return cb(err);
          var file = tree.filter(function(file) {
            return file.path === path;
          })[0];
          cb(null, file ? file.sha : null);
        });
    };
/*
    Repo.prototype.getSha = function(branch, path, cb) {
        if (!path || path === "") return this.getRef("heads/"+branch, cb);
        this._request("GET", "/contents/"+path, {ref: branch}, function(err, pathContent) {
            if (err) return cb(err);
            cb(null, pathContent.sha);
        });
    };
*/
    Repo.prototype.getTree = function(tree, cb) {
        this._request("GET", "/git/trees/"+tree, null, function(err, res) {
          if (err) return cb(err);
          cb(null, res.tree);
        });
    };
    Repo.prototype.postBlob = function(content, cb) {
        if (typeof(content) === "string") {
            content = {
                "content": content,
                "encoding": "utf-8"
            };
        } else {
            content = {
                "content": Base64.encode(content),
                "encoding": "base64"
            };
        }

        this._request("POST", "/git/blobs", content, function(err, res) {
            if (err) return cb(err);
            cb(null, res.sha);
        });
    };
    Repo.prototype.updateTree = function(baseTree, path, blob, cb) {
        var data = {
            "base_tree": baseTree,
            "tree": [
                {
                    "path": path,
                    "mode": "100644",
                    "type": "blob",
                    "sha": blob
                }
            ]
        };
        this._request("POST", "/git/trees", data, function(err, res) {
            if (err) return cb(err);
            cb(null, res.sha);
        });
    };

    Repo.prototype.commit = function(parent, tree, message, cb) {
        var data = {
            "message": message,
            "author": {
                "name": this.user
            },
            "parents": [
                parent
            ],
            "tree": tree
        };

        this._request("POST", "/git/commits", data, function(err, res) {
            this.currentTree.sha = res.sha; // update latest commit
            if (err) return cb(err);
            cb(null, res.sha);
        });
    };

    Repo.prototype.updateHead = function(head, commit, cb) {
        this._request('PATCH', '/git/refs/heads/' + head, { "sha": commit }, function(err) {
            cb(err);
        });
    };
    Repo.prototype.show = function(cb) {
        this._request('GET', '', {}, cb);
    };
    Repo.prototype.contents = function(branch, path, cb) {
        return this._request("GET", "/contents?ref=" + branch + (path ? "&path=" + path : ""), null, cb);
    };

/*
    Repo.prototype.read = function(branch, path, cb) {
        this._request("GET", "/contents/"+path, {ref: branch}, function(err, obj) {
            if (err && err.error === 404) return cb("not found", null, null);

            if (err) return cb(err);
            var sha = obj.sha;
            var content = null;
            if(obj.encoding == 'utf-8') {
                content = obj.content;
            } else  if(obj.encoding == 'base64') {
                content = Base64.decode(obj.content);
            } else {
                throw new Error('unsupported encoding:['+obj.content+']use readBlob');
            }

            cb(null, content, sha);
        });
    };
*/

/*
    Repo.prototype.write = function(branch, path, content, message, cb) {
        var that = this;
        this.getSha(branch, path, function(err, sha) {
            console.log('getSha:',branch,path,sha);
            if (err && err.error!=404) return cb(err);
            that._request("PUT", "/contents/" + path, {
                message: message,
                content: Base64.encode(content),
                branch: branch,
                sha: sha
            }, cb);
        });
    };
*/
    Repo.prototype.read = function(branch, path, cb) {
        var that = this;
        this.readBlob(branch, path, function(err, data, sha, xhr){
            if(err) {return cb(err);}
            console.log('readBlob:',err,data,sha,xhr);
            if(data && typeof data == 'string') {
                cb(null, data);
            } else if(data && typeof data == 'object') {
                if(data.encoding == 'utf-8') {
                    cb(null, data.content);
                } else if (data.encoding == 'base64'){
                    cb(null, Base64.decode(data.content));
                } else {
                    cb(null, data);
                }
            } else {
                cb('unhadled read xhr.responseType:'+xhr.responseType, xhr);
            }
        });
    };

    Repo.prototype.readBlob = function(branch, path, cb) {
        var self = this;
        self.getSha(branch, path, function(err, sha) {
            if (!sha) return cb("not found", null);
            self.getBlob(sha, function(err, content, xhr) {
                cb(err, content, sha, xhr);
            });
        });
    };

    Repo.prototype.write = function(branch,path,content,message,cb){
        this.writeBlob(branch,path,content,message,cb);
    };
    Repo.prototype.writeBlob = function(branch, path, content, message, cb) {
        var that = this;
        this._updateTree(branch, function(err, latestCommit) {
            if (err) return cb(err);
            that.postBlob(content, function(err, blob) {
                if (err) return cb(err);
                that.updateTree(latestCommit, path, blob, function(err, tree) {
                    if (err) return cb(err);
                    that.commit(latestCommit, tree, message, function(err, commit) {
                        if (err) return cb(err);
                        that.updateHead(branch, commit, cb);
                    });
                });
            });
        });
    };

    if (typeof exports !== 'undefined') {
        module.exports = Github;
    } else {
        window.Github = Github;
    }
}).call(this);
