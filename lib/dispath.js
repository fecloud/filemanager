/**
 * Created with JetBrains WebStorm.
 * User: ouyangfeng
 * Date: 7/15/14
 * Time: 22:37
 * To change this template use File | Settings | File Templates.
 */
var util = require('./util.js');
var log = require('./log.js');
var filemanager = require('./filemanager.js');

var route = {};

route.list = function (req, res, params) {

    util.result_client(req, res, filemanager.list_dir(params));

};

route.delete = function (req, res, params) {

    util.result_client(req, res, filemanager.delete_file(params));

};

route.newfolder = function (req, res, params) {

    filemanager.new_dir(req, res, params);
};

route.upload = function (req, res, params) {
    filemanager.save_file(req, res, params);

};

route.rename = function (req, res, params) {

    filemanager.rename(req, res, params);
};

route.search = function (req, res, params) {

    filemanager.search(req, res, params);
};


exports.route = route;