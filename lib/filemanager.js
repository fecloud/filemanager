/**
 * Created by Feng OuYang on 2014-07-08.
 */
var fs = require("fs");
var formidable = require("formidable");

var err_const = require('./error.js');
var util = require('./util.js');
var log = require('./log.js');


/**
 * 返回数据
 * @constructor
 */
var File = function () {
    this.isFile = false;
    this.isDir = false
    this.name;
    this.size;
    this.mtime;
    this.path = "";
};

var webroot = process.argv[3];

/**
 * 取文件详细信息
 * @param dir
 * @param files
 * @returns {Array}
 */
function get_files_info(dir,base, files) {
    var file_dirs = [];
    var file_files = [];

    files.forEach(function (name) {
        var f = new File();
        var st = fs.statSync(dir + name);
        if (st.isDirectory()) {
            f.isDir = true;
            f.name = name;
            f.size = st.size;
            f.mtime = st.mtime.toLocaleString();
            f.path = base + name;
            file_dirs.push(f);
        } else if (st.isFile()) {
            f.isFile = true;
            f.name = name;
            f.size = st.size;
            f.mtime = st.mtime.getTime();
            f.path = base + name;
            file_files.push(f);
        }
    });

    return file_dirs.concat(file_files);;
}

/**
 * 返回当前目录的子目录以及文件
 */
function list_dir(params) {

    var result = new Object();
    if (params.value) {
        //如果客户端传来的数据没有加/,自动加上
        if (params.value.substring(params.value.length - 1) != '/') {
            params.value = params.value + '/';
        }
        var dir = webroot + params.value;

        var files = fs.readdirSync(dir);
        var array_files = get_files_info(dir, params.value, files);

        //有按页加载
        if (params.skip) {

            if (array_files.length >= params.skip) {
                var page_array = [];
                for (var i = params.skip; i < array_files.length; i++) {

                    page_array.push(array_files[i]);

                    if (params.num != undefined && (i - params.skip == (params.num - 1) )) {

                        result.data = page_array;
                        if (i < array_files.length - 1) {
                            result.more = true;
                        }
                        return result;
                    }

                }
                result.data = page_array;
                result.more = false;

            } else {
                result.data = [];
                result.more = false;
            }

        } else {
            result.data = array_files;
        }

    }
    return result;
}

exports.list_dir = list_dir;

/**
 * 删除文件夹
 * @param path
 */
function delete_folder(path) {

    var files = [];

    if (fs.existsSync(path)) {

        files = fs.readdirSync(path);

        files.forEach(function (file, index) {

            var curPath = path + "/" + file;

            if (fs.statSync(curPath).isDirectory()) { // recurse

                delete_folder(curPath);

            } else { // delete file

                fs.unlinkSync(curPath);

            }

        });

        fs.rmdirSync(path);

    }

}

/**
 * 删除文件
 */
function delete_file(params) {
    var result = new Object();

    var path = webroot + params.value;
    if (params && params.value && fs.existsSync(path)) {
        var st = fs.lstatSync(path);
        //删除文件
        if (st.isFile()) {
            log.d("delete file " + path);
            fs.unlinkSync(path);

        } else {
            log.d('delete folder ' + path);
            delete_folder(path);
        }
        result.data = true;

    } else {
        log.e("check folder param");
        result = err_const.err_400;
    }
    return result;
}

exports.delete_file = delete_file;

/**
 * 保存文件
 * @param req
 * @param res
 * @returns {Result}
 */
function save_file(req, res, params) {

    var result = new Object();
    if (!params.value) {
        log.e('require save path!');
        result = err_const.err_400;
    } else {
        var save_dir = webroot + params.value;
        if (save_dir.substring(save_dir.length - 1) != '/') {
            save_dir = save_dir + '/';
        }
        // parse a file upload
        var form = new formidable.IncomingForm();
        form.encoding = 'utf-8';
        form.uploadDir = save_dir;

        form.parse(req, function (err, fields, files) {

            if (fields.file_list) {
                var renamefiles = JSON.parse(fields.file_list);
                renamefiles.forEach(function (name) {

                    fs.rename(files[name].path, save_dir + name);
                    log.d("rename " + files[name].path + " to " + save_dir + name);

                });
                result.data = renamefiles;
            } else {
                log.e("not found files!");
                result = err_const.err_400;
            }
            util.result_client(req, res, result);

        });
    }

}

exports.save_file = save_file;

/**
 * 新建文件夹
 * @param params
 * @returns {exports.web_result}
 */
function new_dir(req, res, params) {

    var result = new Object();
    var path = webroot + params.value;
    result.data = fs.mkdir(path, function () {
        log.d('new folder:' + path);
        util.result_client(req, res, result);
    });

}

exports.new_dir = new_dir;


/**
 * 重命名
 * @param req
 * @param res
 * @param params
 */
function rename(req, res, params) {

    var result = new Object();
    var path = webroot + params.value;
    var target = webroot + params.target;

    log.d('path:' + path + " target:" + target);

    fs.rename(path, target, function (err) {

        if (err) {
            log.e(err);
            result = err_const.err_500;
        } else {
            result.data = 'true';
        }
        util.result_client(req, res, result);

    });

}

exports.rename = rename;


/**
 *搜索文件
 * @param req
 * @param res
 * @param params
 */
function search_dir(req, res, params) {

    if (params.query && params.value) {

        //如果客户端传来的数据没有加/,自动加上
        if (params.value.substring(params.value.length - 1) != '/') {
            params.value = params.value + '/';
        }

        var dir = webroot + params.value;

        fs.readdir(dir,function (err , files) {
            if (err) {
                util.result_client(req, res, err_const.err_404);
            } else {
                var file_array = [];

                var q = params.query.toLowerCase();
                files.forEach(function (name){
                    if (name.toLowerCase().indexOf(q) > -1) {
                        file_array.push(name)
                    }
                });

                var result = new Object();

                //没有找到匹配的
                if ( file_array.length == 0 ){
                    result.data = file_array;
                }else {
                    result.data = get_files_info(dir, params.value ,file_array);
                }
                util.result_client(req, res, result);
            }
        });

    } else {
        util.result_client(req, res, err_const.err_400);
    }

}

exports.search = search_dir;