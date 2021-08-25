function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function boot() {
    var spacecount = 18;
    var checked = ['Video', 'Keyboard', '640 Kb', 'Serial port', 'Parallel port', 'Floppy disk'];
    var scstr = "";
    for (var i = 0; i < checked.length; i++) {
        document.getElementById("boot").innerHTML = scstr;
        scstr += checked[i];
        await sleep(500);
        scstr += (" ".repeat(spacecount - checked[i].length) + "OK.");   
        document.getElementById("boot").innerHTML = scstr + "<b>_</b><br>";
        scstr += "<br>";
        await sleep(500);
    }
    /*BOOT SEQUENCE PART 2*/
    var q = false;
    for (var j = 0; j < 10; j++) {
        await sleep(500);
        if (q == true) {
            document.getElementById("boot").innerHTML = scstr + "<b>_</b>";
        }
        else {
            document.getElementById("boot").innerHTML = scstr;
        }
        q = !q;
    }
    document.getElementById("boot").innerHTML = scstr;
    /*BOOT SEQUENCE PART 3*/
    var path = "C:\\System>";
    var megamsg = [
        ":<<<<<<<<<<<-O->>>>>>>>>>>>:",
        " <||||||||||||||||||||||||> ",
        " <||| ICMS CONFIG FILE |||> ",
        " <|----------------------|> ",
        " <|||                  |||> ",
        " <||                    ||> ",
        " <|    Thank you for     |> ",
        " <|   choosing  ICMS!    |> ",
        " <|     Running the      |> ",
        " <|    ICMS config...    |> ",
        " <||                    ||> ",
        " <|||                  |||> ",
        " <|----------------------|> ",
        " <||| ICMS MEGASYSTEMS |||> ",
        " <||||||||||||||||||||||||> ",
        ":<<<<<<<<<<<-O->>>>>>>>>>>>:"
    ];
    const concom = function (q) { q = q.replace("\n", "<br>"); return path + q; }
    const com = function (q) { return q.replace("\n", "<br>"); }
    document.getElementById("boot").innerHTML += concom("runcog ICMS.cog\n");
    await sleep(200);
    document.getElementById("boot").innerHTML += com("cogcontent: 'exec K.MS; exec S.MS; exec GRAPH.MS;\n")
    await sleep(30);
    document.getElementById("boot").innerHTML += com("comment{\n");
    for (var i = 0; i < megamsg.length; i++) {
        await sleep(300);
        document.getElementById("boot").innerHTML += com(megamsg[i] + "\n");
    }
    document.getElementById("boot").innerHTML += com("};\n'\n");
    await sleep(20);
    document.getElementById("boot").innerHTML += concom("exec K.MS\n");
    await sleep(650);
    document.getElementById("boot").innerHTML += com('Executed K.MS, returned s"Success"\n');
    await sleep(45);
    document.getElementById("boot").innerHTML += concom("exec S.MS\n");
    await sleep(650);
    document.getElementById("boot").innerHTML += com('Executed S.MS, returned s"Success"\n');
    await sleep(100);
    document.getElementById("boot").innerHTML += concom("exec GRAPH.MS\n");
    await sleep(300);
    window.location.href = "launch.html";
}
boot();
