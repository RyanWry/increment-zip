/**
 * Created by ruiyuan on 15-9-12.
 */

var fs = require('fs');
var crypto = require('crypto');
var archiver = require('archiver');
var assert = require('assert');

/**
 * 生成版本增量更新的zip包及各个版本文件md5描述
 *
 * @param {Object=} option
 * @param {String=} version
 */
function scan(option, version) {

    assert(option.homePath, 'requires a homePath');
    assert(option.zipPath, 'requires a zipPath');
    assert(option.versionPath, 'requires a versionPath');

    option.name = option.name
        ? option.name += '/'
        : '';
    var json = {};
    var walk = function (path, json) {
        var files = fs.readdirSync(path);
        files.forEach(function (item) {
            var tmpPath = path + '/' + item;
            var stats = fs.statSync(tmpPath);
            if (stats.isDirectory()) {
                walk(tmpPath, json);
            } else {
                json[tmpPath.replace(option.homePath, '')] = getMd5(tmpPath);
            }
        })
    };
    walk(option.homePath, json);

    var verZip = archiver('zip');
    verZip.pipe(fs.createWriteStream(option.zipPath + 'v0_' + version + '.zip'));
    verZip.append(JSON.stringify({version: version}), {name: option.name + 'config.json'});
    verZip.directory(option.homePath, option.name);
    verZip.finalize();

    var vList = fs.readdirSync(option.versionPath);
    vList.forEach(function (item) {
        if (item.split('.')[0] !== version && item.split('.')[1] === 'json') {
            var changeList = [];
            var v = fs.readFileSync(option.versionPath + '/' + item);

            for (var key in json) {
                if (json[key] !== JSON.parse(v)[key])changeList.push(key);
            }

            var zipName = item.split('.')[0] + '_' + version + '.zip';
            var output = fs.createWriteStream(option.zipPath + zipName);
            var zipArchiver = archiver('zip');
            zipArchiver.pipe(output);
            for (var i = 0; i < changeList.length; i++) {
                zipArchiver.append(fs.createReadStream(option.homePath + changeList[i]), {'name': option.name + changeList[i]});
            }
            zipArchiver.append(JSON.stringify({version: version}), {name: option.name + 'config.json'});
            zipArchiver.finalize();
        }
    });

    fs.writeFileSync(option.versionPath + version + '.json', JSON.stringify(json), 'utf-8');
}

function getMd5(p) {
    var str = fs.readFileSync(p, 'utf-8');
    var md5um = crypto.createHash('md5');
    md5um.update(str);
    return md5um.digest('hex');
}


module.exports = scan;
