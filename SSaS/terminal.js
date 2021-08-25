document.getElementsByTagName("input")[0].focus();
function grindcog(argstr) {
    /*
    CELL Hello,;CELL World!;ECHO 0+&SPACE&+1
    */
    let cogs = argstr.split(";");
    let vararr = [];
    for (let z = 0; z < cogs.length; z++) {
        let i = cogs[z];
        if (i.startsWith("CELL")) {
            vararr.push(i.split(" ")[2]);
        }
        if (i.startsWith("ECHO")) {
            let echoarr = i.split(" ")[1].split("+");
            let retstring = "";
            for (let j = 0; j < echoarr.length; j++) {
                if ("&SPACE&" == echoarr[j]) {
                    retstring += " ";
                    continue;
                }
                retstring += vararr[parseInt(echoarr[j], 10)];
            }
            return retstring;
        }
    }
    return "";
}

function parsecog() {
    let inpel = document.getElementsByTagName("input")[0].value;
    if (inpel.toLowerCase().endsWith("help")) {
        return "In the case that this is an actual emergency, a team has been sent your way.\nOtherwise, you will find the console commands in the console manual.";
    }
    if (inpel.toLowerCase().endsWith("cls")) {
        document.getElementById("pholderholder").innerHTML = "<pholderclass></pholderclass>"
        return "";
    }
    if (inpel.toLowerCase() != inpel.toLowerCase().replace("runcog", "")) {
        let cogfile = inpel.toLowerCase().split("runcog ")[1];
        grindcog(window.localStorage.getItem(cogfile));
    }
    return "Error: Incorrect Command";
}

function inptopre() {
    let inpel = document.getElementsByTagName("input")[0];
    let p = parsecog();
    document.getElementById("opcenter").innerHTML = document.getElementById("opcenter").innerHTML.replace("<pholderclass></pholderclass>", "<pre name=\"conhistory\">" + "C:\\DESKTOP>" + inpel.value + "\n" + p + "</pre>\n<pholderclass></pholderclass>");
}

function elem(e) {
    if (e.key == 'Enter') {
        e.preventDefault();
        inptopre();
        document.getElementsByTagName("input")[0].value = "";
    }
    document.getElementsByTagName("input")[0].focus();
    document.getElementsByTagName("input")[0].addEventListener('keydown', elem);
}

document.getElementsByTagName("input")[0].addEventListener('keydown', elem);
