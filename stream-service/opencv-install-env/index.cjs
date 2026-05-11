const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD ||= "1";

if (!/(^|\s)-std=c\+\+20(\s|$)/.test(process.env.CXXFLAGS || "")) {
  process.env.CXXFLAGS = `${process.env.CXXFLAGS || ""} -std=c++20`.trim();
}

function pkgConfigValue(variable) {
  try {
    return execFileSync("pkg-config", [`--variable=${variable}`, "opencv4"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function firstExistingDir(candidates) {
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || "";
}

const prefix = firstExistingDir([
  process.env.OPENCV_HOME,
  pkgConfigValue("prefix"),
  "/opt/homebrew/opt/opencv",
  "/usr/local/opt/opencv",
]);

process.env.OPENCV_INCLUDE_DIR ||= firstExistingDir([
  pkgConfigValue("includedir"),
  prefix && path.join(prefix, "include", "opencv4"),
]);

process.env.OPENCV_LIB_DIR ||= firstExistingDir([
  pkgConfigValue("libdir"),
  prefix && path.join(prefix, "lib"),
]);

process.env.OPENCV_BIN_DIR ||= firstExistingDir([
  pkgConfigValue("bindir"),
  prefix && path.join(prefix, "bin"),
]);
