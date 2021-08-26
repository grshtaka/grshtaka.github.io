if (!document.cookie.split('; ').find(row => row.startsWith('dS'))) {
    document.cookie = "dS=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; SameSite=None; Secure";
    window.localStorage.setItem("files", ";readme.txt");
    var q = [
        '--------------------------------------------------------------------------------------------------------------',

                                                                                  
'                                                    /                          /                  ',
'                                                  #/                         #/                   ',
'                                                 ##           #             ##                   ',
'                                                  ##          ##             ##                   ',
'                                                  ##          ##             ##                   ',
'                   /###    ###  /###     /###    ##  /##   ######## /###    ##  /##      /###    ',
'                  /  ###  / ###/ #### / / #### / ## / ### ######## / ###  / ## / ###    / ###  / ',
'                  /    ###/   ##   ###/ ##  ###/  ##/   ###   ##   /   ###/  ##/   /    /   ###/  ',
'                 ##     ##    ##       ####       ##     ##   ##  ##    ##   ##   /    ##    ##   ',
'                 ##     ##    ##         ###      ##     ##   ##  ##    ##   ##  /     ##    ##   ',
'                 ##     ##    ##           ###    ##     ##   ##  ##    ##   ## ##     ##    ##   ',
'                 ##     ##    ##             ###  ##     ##   ##  ##    ##   ######    ##    ##   ',
'                ##     ##    ##        /###  ##  ##     ##   ##  ##    /#   ##  ###   ##    /#   ',
'                 ########    ###      / #### /   ##     ##   ##   ####/ ##  ##   ### / ####/ ##  ',
'                    ### ###    ###        ###/     ##    ##    ##   ###   ##  ##   ##/   ###   ## ',
'                        ###                             /                                         ',
'                   ####   ###                           /                                         ',
'                 /######  /#                           /                                          ',
'                /     ###/                            /                                           ',

'',
'----------------------------------------------------------------------------------------------------------------------',
'',
'                        ICMS SUPREME MEGASYSTEM MANUAL PAGE 2 : YOUR PROGRAMS AND SOFTWARE',
'',
'--------------------------------------------------------------------------------------------------------------',
'',
'Your programs are the tools that allow your computer to work, and more importantly, they are the things you ',
'will see whenever you are using the ICMS Supreme. Mainly, the agenda program.',
'',
'To open up the agenda program, you have to execute it. This can be done from the console, or the user interface.',
'',
'We will use the user interface for this guide, as you will find the console commands in page 4. First, in the',
'dashboard, aim your mouse cursor at "agenda.exe" using your mouse utility, than press your left mouse button.',
'This will execute and launch the agenda program.',
'',
'((((SECTION 1 : WRITING FILES, CHANGING FILE EXTENSIONS, SAVING FILES AND HTML)))) ',
'',
'You will be greeted by an user interface. To start writing, aim at the bottom part of the screen that if filled',
'with black. Press your left mouse button on it, and you can now start typing.',
'',
'After you type, you might want to change the filename. You can click on the top center of your screen to do so.',
'',
'After finally writing your file with an appropiate filename, you can click on the button that says "SAVE FILE"',
'to save your file. ',
'',
'Additionaly, if you are familiar with the programming language "HTML", if you save the filename with a .html',
'extension, the ICMS built in HTML renderer will render your HTML page.',
'',
'((((SECTION 2: DELETING FILES, OPENING FILES))))',
'',
'To open a file, you need to enter the name of the file as the filename, and then click the "open file" button.',
'This will open the file you want to edit. To delete a file, you must first open it and then click the "delete',
'file" button.'
    ];
    window.localStorage.setItem("readme.txt", q.join("\n"));
}
if (location.hash.startsWith("#OPENINTEXT;")) {
    window.location.replace("agenda.html#" + location.hash.split(";")[1]);
}
