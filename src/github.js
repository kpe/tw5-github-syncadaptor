/**
 * File: github.js
 * Created by kpe on 22-May-2014 at 2:26 PM.
 */

(function(){
    /*jslint node:false, browser:true */
    /*global $tw: false*/
    'use strict';

    var API_URL = 'https://api.github.com';

    var _tw_request = function(options) {
        var type = options.type || "GET",
            headers = options.headers || {accept: "application/json"},
            request = new XMLHttpRequest(),
            data = "",
            results;

//console.log('>>_request',options);

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
/*
        // Massage the data hashmap into a string
        if(options.data) {
            if(typeof options.data === "string") { // Already a string
                data = options.data;
            } else { // A hashmap of strings
                results = [];
                $tw.utils.each(options.data,function(dataItem,dataItemTitle) {
                    results.push(dataItemTitle + "=" + encodeURIComponent(dataItem));
                });
                data = results.join("&");
            }
        }
*/
        // Set up the state change handler
        request.onreadystatechange = function() {
            if(this.readyState === 4) {
                if(this.status === 200 || this.status === 204) {
                    // Success!
                    options.callback(null,options.raw ? this.responseText:this.response, this);
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
//        if(data && headers.hasOwnProperty("Content-type")) {
//            request.setRequestHeader("Content-type","application/x-www-form-urlencoded; charset=UTF-8");
//        }
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
    }
    function extend(base, sup) {
        for(var prop in sup) {
            if(sup.hasOwnProperty(prop)) {
                if(sup[prop] === null) {
                    if(typeof base[prop] != 'undefined') {
                        delete base[prop];
                    }
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
        var ropts = extend(extend({
            type: method,
            url: getGitHubURL(url)
        }, {
            headers: this.authHeaders,
            callback: cb,
            data: data
        }), opts);
        if(typeof $tw != 'undefined') {
            return $tw.utils.httpRequest(ropts);
        } else {
            _tw_request(ropts);
        }
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
        return this._github._request(method,this.repoPath + path, data == null? null : {data: data}, cb, opts);
    };

    Repo.prototype.updateTree = function(branch, cb) {
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
        this._request("GET", "/git/blobs/" + sha, null, cb, {raw:true}); // TODO: implement raw
    };
/*
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
*/
    Repo.prototype.getSha = function(branch, path, cb) {
        if (!path || path === "") return this.getRef("heads/"+branch, cb);
        this._request("GET", "/contents/"+path, {ref: branch}, function(err, pathContent) {
            if (err) return cb(err);
            cb(null, pathContent.sha);
        });
    };

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

    Repo.prototype.read = function(branch, path, cb) {
        var self = this;
        self.getSha(branch, path, function(err, sha) {
            if (!sha) return cb("not found", null);
            self.getBlob(sha, function(err, content) {
                cb(err, content, sha);
            });
        });
    };

    Repo.prototype.write = function(branch, path, content, message, cb) {
        var that = this;
        this.updateTree(branch, function(err, latestCommit) {
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
