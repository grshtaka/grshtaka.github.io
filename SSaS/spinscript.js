function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function load() {
    await sleep(500);
    document.getElementById("launch").style = "background-color: black;";
    var spin = ['|','/','-','\\'];
    var i = 0;
    setInterval( function() {
        document.getElementById("spin").innerHTML = spin[i % spin.length];  
        i++;
    }, 200);
    await sleep(3500);
    window.location.href = "dash.html";
}
load();