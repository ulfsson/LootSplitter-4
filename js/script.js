// Global references that will be accessed frequently.
const PARTY_NUMBER_INPUT = document.getElementById('partyNumber');
const LOOT_TABLE = document.getElementById('lootTable');
const LOOT_FORM = document.querySelector('#lootForm');
const STORAGE_KEY = "lootSplitterState";

// Global variables.
let lootList = []; // Set up the loot list array.
let partySize = 1; // Global variable for the party size.
let totalLootPartyValue = 0.0; // For use when splitting loot value among the party.
let totalLootQuantity = 0;


// Class for creating individual items of loot, and provides a couple of nice features.
class LootItem {
    constructor(name, value = 0.0, quantity = 1, rarity = 1) {
        this.name = name;
        this.quantity = Number(quantity);
        this.value = Number(value);

        // Default rarity value to the standard "common" just in case an invalid value gets snuck in.
        this.rarity = Number(rarity);
        if (isNaN(this.rarity)) this.rarity = 1;
    }

    // Returns an item's base value modified by an amount congruent with higher "tiers" of rarity/quality.
    // This "rarity" setup is more inspired by MMORPG quality tiers.
    get rarityValue() {
        switch(this.rarity) {
            case 0: return this.value * 0.75; // Poor
            case 1: return this.value; // Common
            case 2: return this.value * 1.25; // Uncommon
            case 3: return this.value * 1.50; // Rare
            case 4: return this.value * 1.75; // Epic
            default: return this.value;
        }
    }

    // Returns the string name of the rarity numerical value on the object.
    get rarityName() {
        switch(this.rarity) {
            case 0: return "Poor";
            case 1: return "Common";
            case 2: return "Uncommon";
            case 3: return "Rare";
            case 4: return "Epic";
            default: return "Common"; // Just in case some other value sneaks in.
        }
    }
}


// This function looks at how many pieces of loot are available, looks at how many players have been defined,
// then does a simple division for loot distribution. Of course, if there are more players than loot then
// some players may not get any (will be a float less than 1.0).
function splitLoot() {
    // With the way the code logic is written this should NEVER happen, but in the world of
    // HTML and JavaScript anything is possible, so better safe than sorry. Don't want a divide by zero.
    // Also, why does JavaScript return Infinity in a 1/0 situation? In proper math It's UNDEFINED.
    // As you approach zero, it goes toward infinity, but it is NOT actually infinity!
    // Furthermore 0/0 results in NaN?? JavaScript, why??!!
    if (partySize < 1) return;

    document.getElementById('totalLoot').innerText = totalLootQuantity;
    document.getElementById('lootPerPlayer').innerText = (totalLootQuantity / partySize).toFixed(2);
    document.getElementById('lootValueTotal').innerText = (totalLootPartyValue).toFixed(2);
    document.getElementById('lootValuePerPlayer').innerText = (totalLootPartyValue / partySize).toFixed(2);

    if (lootList.length === 0) {
        document.getElementById('lootSplitOutput').style.display = "none";
    } else {
        document.getElementById('lootSplitOutput').style.display = "block";
    }
}


// Creates the table rows for the loot list table and unhides/hides it based on available data.
// I realize this is a little ugly and could be accomplished with divs, but I largely wanted to
// see if I could apply the assignment concepts to my existing table structure. I may refactor this.
function renderLoot() {
    const LOOT_DATA = document.getElementById("lootData");
    LOOT_DATA.innerHTML = "";
    totalLootPartyValue = 0.0;
    totalLootQuantity = 0;

    // When updating the loot table, if the length is zero we just blank it out, hide it, and bail.
    if (lootList.length === 0) {
        LOOT_TABLE.style.display = "none";
        document.getElementById('no-loot-message').style.display = "block";
        return;
    }

    // For adding up the totals in the loop below.
    let totalLootBaseValue = 0.0;
    let totalLootRarityValue = 0.0;

    // Loop through each loot item in lootList, total up values, and build a new row for it in the loot table.
    for (const [index, item] of lootList.entries()) {
        totalLootQuantity += item.quantity;
        totalLootBaseValue += item.value;
        totalLootRarityValue += item.rarityValue;
        totalLootPartyValue += (item.rarityValue * item.quantity);

        let lootTableRow = document.createElement("tr");
        let lootRowData = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${item.rarityName}</td>
            <td>${item.value.toFixed(2)}</td>
            <td>${item.rarityValue.toFixed(2)}</td>
            <td>${(item.rarityValue * item.quantity).toFixed(2)}</td>
            `;

        lootTableRow.innerHTML = lootRowData;
        
        // Build the remove button. This used to be a div, but now it's an actual button because why not.
        let removeButtonCell = document.createElement("td");
        let removeButton = document.createElement("button");
        removeButton.innerText = "❌";
        removeButton.className = "removeFromLootButton";
        
        removeButtonCell.appendChild(removeButton);
        lootTableRow.appendChild(removeButtonCell);
        LOOT_DATA.appendChild(lootTableRow);
        
        removeButton.addEventListener("click", function() { removeLoot(index) });
    }

    // The spacer line between the last item and the totals line.
    // LOOT_DATA.insertAdjacentHTML("beforeend", `<tr><td colspan="9">&nbsp;</td></tr>`);

    // Set the loot totals in the table's totals line.
    document.getElementById('totalLootQuantity').innerText = totalLootQuantity;
    document.getElementById('totalLootPartyValue').innerText = totalLootPartyValue.toFixed(2);
    
    document.getElementById('no-loot-message').style.display = "none"; // Hide the "no loot to display" message.

    LOOT_TABLE.style.display = "table";
}


// This adds loot to the lootList global array, using the name, quantity, value, and quality/rarity selector.
// This makes use of a custom class to construct the loot object.
function addLoot() {
    let itemName = LOOT_FORM.elements['lootname'].value.trim(); // Make sure we trim whitespace from the name.
    
    // No adding loot with a blank name or just numbers.
    if (itemName === "") return;
    if (!isNaN(Number(itemName))) return;
    
    // Quantities less than 1 will default to at least 1.
    let [itemQuantity, wasInputValid] = forcePositiveNonZeroInteger(LOOT_FORM.elements['lootquantity'].value);
    if (!wasInputValid) LOOT_FORM.elements['lootquantity'].value = itemQuantity;

    // These variables declared later as there's no sense in doing so early if the above checks return.
    let itemValue = LOOT_FORM.elements['lootvalue'].value;
    let itemRarity = LOOT_FORM.elements['lootquality'].value;

    // Do a bit of sanity check. In the event the loot value isn't a number, default to zero.
    // If it's a negative number, will do the absolute value instead. No negative value allowed!
    itemValue = Number(Math.abs(itemValue))
    if (isNaN(itemValue)) {
        itemValue = 0.0;
        LOOT_FORM.elements['lootvalue'].value = itemValue;
    }
    
    // Construct the new loot item using our custom class using the name, value, and rarity, and push it onto the array.
    let newLoot = new LootItem(itemName, itemValue, itemQuantity, itemRarity);
    lootList.push(newLoot);

    saveState();
    updateUI();
}


function removeLoot(index) {
    if (isNaN(Number(index)) || index === null) return; // Bail out in the event of a bad index value. This shouldn't happen but with JavaScript you never know.
    lootList.splice(index, 1); // Splices out the index of the loot passed into it, therefore removing it from the array.
    saveState();
    updateUI();
}


// For certain validation where the minimum value must be 1 or greater.
// Returns an array. First element is validated value, second element is if the passed in value was valid.
function forcePositiveNonZeroInteger(numberToMakeValid) {
    const validNumber = Number(numberToMakeValid.trim());

    // If it's not a number or equal to zero, snap to 1.
    if (isNaN(validNumber) || validNumber === 0 ) return [1, false];

    // No negative values. Sets the input to the absolute value of what was entered.
    if (validNumber < 0) return [Math.abs(validNumber), false];

    // Is the value entered an integer? If not, truncate it.
    if (!Number.isInteger(validNumber)) return [Math.trunc(validNumber), false];

    return [validNumber, true];
}


// Validation method for the party size input box. Is called every time the input is updated.
// Handles the user entering non-numbers, negative numbers, or floats into the input.
function validatePartySize() {
    let wasInputValid = true;
    [partySize, wasInputValid] = forcePositiveNonZeroInteger(PARTY_NUMBER_INPUT.value);

    if (!wasInputValid) {
        document.getElementById('partyNumber').value = partySize;
        document.getElementById('invalid-party-size-message').style.display = "inline";
    } else {
        document.getElementById('invalid-party-size-message').style.display = "none";
    }
}


function updatePartySize() {
    validatePartySize();
    saveState();
    updateUI();
}


function updateUI() {
    renderLoot();
    splitLoot();

    if (lootList.length === 0) {
        document.getElementById('splitLootButton').setAttribute("disabled", "true");
    } else {
        document.getElementById('splitLootButton').removeAttribute("disabled");
    }
}


function saveState() {
    let saveStateObject = {
        partySize: partySize,
        loot: lootList
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveStateObject));
}


// A simple function to parse a JSON string without a bunch of errors popping up in the console.
function parseJSON(json_string) {
    let parsed_json = null;

    try {
        parsed_json = JSON.parse(json_string);
    } catch (err) { }

    return parsed_json;
}


// Some checks to ensure that the data we're restoring is valid.
// Checks for null, non-object, length, and appropriate types of data.
function validateStateData(saveStateObject) {
    if (saveStateObject === null || typeof(saveStateObject) !== 'object') return false;
    if (!("loot" in saveStateObject) || !("partySize" in saveStateObject)) return false; // We must have these two keys present.
    if (typeof(saveStateObject["partySize"]) !== 'number' || saveStateObject["partySize"] < 1) return false; // Party size must be at least 1.
    if (saveStateObject["loot"].length === 0 || typeof(saveStateObject["loot"]) !== 'object') return false; // The second object must be an object and contain data.

    return true;
}


function restoreSaveStateObject(saveStateObject) {
    // Loops through the loot data and verifies it against a known LootItem object for the correct keys.
    // Then in the for loop after we compare the stringified version of the loot object's keys.
    // If they don't match, we skip that iteration and go to the next.
    let testKeys = JSON.stringify(Object.keys(new LootItem()).sort());
    lootList = []; // Clear out the loot list before processing.

    for (loot of saveStateObject["loot"]) {
        let lootObjectKeys = JSON.stringify(Object.keys(loot).sort()); // Get
        if (lootObjectKeys !== testKeys) continue;

        let newLoot = new LootItem (loot["name"], loot["value"], loot["quantity"], loot["rarity"]);
        lootList.push(newLoot);
    }

    PARTY_NUMBER_INPUT.value = saveStateObject["partySize"];
    partySize = saveStateObject["partySize"];
}


function restoreState() {
    let saveStateObject = parseJSON(localStorage.getItem(STORAGE_KEY));
    console.log(saveStateObject);
    if (saveStateObject === null) return; // If the attempt to parse the JSON is null, just don't do anything.
    if (!validateStateData(saveStateObject)) return; // Validate the object we just loaded and do nothing if it's not valid.

    restoreSaveStateObject(saveStateObject);
    updateUI();
}


function resetAll() {
    PARTY_NUMBER_INPUT.value = 1;
    LOOT_FORM.reset();
    lootList = [];
    localStorage.clear();
    showPartySetup();
    updateUI();    
}


// For some added fun.
function closePartySetup() {
    document.getElementById('partySetupPanel').style.display = "none";
    document.getElementById('party-setup-close').style.display = "block";
}


function showPartySetup() {
    document.getElementById('partySetupPanel').style.display = "grid";
    document.getElementById('party-setup-close').style.display = "none";
}


function loadFromServer() {
    fetch("http://goldtop.hopto.org/load/eikthyrnirU")
    
    .then(response => {
        if (!response.ok) {
            // TODO: Display error in UI.
            console.log(response.status);
            return;
        }
        
        return response.json()
    })
    
    .then(data => {
        if (data && data.status === "loaded") {
            if (data.state === null) return; // If for some reason the data is null, bail.
            if (!validateStateData(data.state)) return; // Validate the object we just loaded and do nothing if it's not valid.

            restoreSaveStateObject(data.state); // Processes the data and sets loot/partySize as appropriate.
            saveState();
            updateUI();
        } else {
            // TODO: Display error message in UI.
            console.log("Could not load data from server.");
        }
    })
    
    .catch(error => {
        console.log(error.message);
    });
}


function syncToServer() {
    const payload = {
        studentId: "eikthyrnirU",
        state: {
            partySize: partySize,
            loot: lootList
        }
    };

    fetch("http://goldtop.hopto.org/sav/eikthyrnirU", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    
    .then(response => {
        if (!response.ok) {
            // TODO: Display error in UI.
            console.log(response.status);
            return;
        }
        
        return response.json();
    })
    
    .then(data => {
        if (data && data.status !== "saved") {
            // TODO: Display error message in UI.
            console.log("Could not save data to server.");
            return;
        }
    })
    
    .catch(error => {
        console.log(error);
    });
}


// A debug function for quickly adding a random set of loot to the loot table without needing to enter things manually.
// Also assigns a random value and rarity.
function debugRandomLoot() {
    const itemNames = ["Helmet", "Hood", "Shoulderpads", "Pauldrons", "Cloak", "Shawl", "Shirt", "Chestguard", "Hauberk", "Bracers", "Armguards", "Gloves", "Gauntlets", "Belt", "Sash", "Leggings", "Greaves", "Pantaloons", "Fishnet Stockings", "Shoes", "Sabatons", "Boots", "Hupodema", "Flip-Flops", "Silver Necklace", "Locket", "Pendant", "Ring", "Signet", "Class Ring", "Dagger", "Battleaxe", "Hatchet", "Short Sword", "Longsword", "Rusty Sword", "Empty Scabbard", "Coin", "Torch", "Rope", "Satchel", "Flask", "Map", "Compass", "Key", "Scroll", "Lantern", "Hammer", "Chisel", "Bowl", "Cup", "Pouch", "Quill", "Book", "Mirror", "Packet of Bird Flu", "Jar of Ear Wax", "Jar of Bees", "Beehive", "Stick", "Eugene", "Book of Terrible JavaScript", "Hot Cup of Coffee", "Warm Cup of Coffee", "Cold Cup of Coffee", "Moldy Cup of Coffee", "Fermented Cup of Coffee", "Pringle", "Squirrel", "Itsy Bitsy Teenie Weenie Yellow Polkadot Bikini"]
    
    let randomNumberOfItems = Math.floor(Math.random() * 5) + 6;

    lootList = [];

    for (let i = 0; i < randomNumberOfItems; i++) {
        let randomLootName = itemNames[Math.floor(Math.random() * itemNames.length)];
        let randomQuantity = Math.floor(Math.random() * 5) + 1;
        let randomValue = Number((Math.random() * 10).toFixed(2));
        let randomRarity = Math.floor(Math.random() * 5);
        let newLoot = new LootItem(randomLootName, randomValue, randomQuantity, randomRarity);
        lootList.push(newLoot);
    }

    saveState();
    updateUI();
}


function debugTestSyncGet() {
    loadFromServer();
}


function debugTestSyncPost() {
    syncToServer();
}


// Set up the event listeners for the existing buttons on the page.
document.getElementById('addLootButton').addEventListener('click', addLoot);
document.getElementById('splitLootButton').addEventListener('click', updateUI);
document.getElementById('partyNumber').addEventListener('change', updatePartySize);
document.getElementById('debugRandomLoot').addEventListener('click', debugRandomLoot);
document.getElementById('party-setup-close-button').addEventListener('click', closePartySetup);
document.getElementById('party-setup-show-button').addEventListener('click', showPartySetup);
document.getElementById('resetAllButton').addEventListener('click', resetAll);
document.getElementById('debugTestSyncPost').addEventListener('click', debugTestSyncPost);
document.getElementById('debugTestSyncGet').addEventListener('click', debugTestSyncGet);


restoreState();

