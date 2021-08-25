if (location.hash != "") {
    var txtname = location.hash.replace("#", "")
    var txtcon = window.localStorage.getItem(txtname);
    document.getElementById("main").value = txtcon;
    document.getElementById("filename").value = txtname;
}
function savedoc() { 
    window.localStorage.setItem(document.getElementById("filename").value, document.getElementById("main").value);
    if (window.localStorage.getItem("files") == null) { window.localStorage.setItem("files", ""); }
    if (window.localStorage.getItem("files").replace(document.getElementById("filename").value, "") == window.localStorage.getItem("files")) {
        window.localStorage.setItem("files", (window.localStorage.getItem("files") + ";" + document.getElementById("filename").value).replace("null", ""));
    }
}
function deletedoc() {
  let fn = document.getElementById("filename").value;
	window.localStorage.removeItem(fn);
  window.localStorage.setItem("files", window.localStorage.getItem("files").replace(";" + fn, ""));
  window.location.replace("dash.html");
}
function opendoc() {
  window.location.replace("dash.html#OPENINTEXT;" + document.getElementById("filename").value);
}
