// Basis Phaser 3 gameconfiguratie voor een summoning game
const config = {
    type: Phaser.AUTO,
    width: Math.max(window.innerWidth * 0.7, 400),
    height: Math.max(window.innerHeight * 0.7, 400),
    backgroundColor: '#222',
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);

// Voeg deze regel toe om scrollen te voorkomen
document.body.style.overflow = 'hidden';

window.addEventListener('resize', () => {
    game.scale.resize(
        Math.max(window.innerWidth * 0.7, 400),
        Math.max(window.innerHeight * 0.7, 400)
    );
});

function preload() {
    // Laad alle sprites uit de assets map
    const creatures = [
        'Draak', 'Feniks', 'Golem', 'Elf', 'Wolf', 'Tovenaar', 'Slang', 'Vampier', 'Goblin', 'Reus',
        'Sprite', 'Zombie', 'Eenhoorn', 'Trol', 'Sfinx', 'Manticore', 'Minotaurus', 'Fee', 'Orc', 'Hydra'
    ];
    creatures.forEach(name => {
        this.load.image(name, `assets/${name}.png`);
    });
}

function create() {
    this.summonText = this.add.text(this.scale.width / 2, 70, 'Klik om te summonen!', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
    this.summoned = [];
    this.listVisible = false;
    this.listText = this.add.text(this.scale.width / 2, 180, '', { fontSize: '18px', fill: '#fff', align: 'center' }).setOrigin(0.5, 0).setVisible(false);
    this.spriteGroup = this.add.group();
    this.listSpritesGroup = this.add.group(); // Groep voor sprites in de lijst
    // Maak een knop
    this.listButton = this.add.text(this.scale.width / 2, 120, 'Toon lijst', { fontSize: '20px', fill: '#0f0', backgroundColor: '#333', padding: { x: 8, y: 4 } })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            this.listVisible = !this.listVisible;
            if (this.listVisible) {
                this.listText.setText(getSummonedList(this.summoned));
                this.spriteGroup.setVisible(false); // Verberg main sprites
                showListSprites.call(this); // Toon sprites in de lijst
            } else {
                this.spriteGroup.setVisible(true); // Toon main sprites
                this.listSpritesGroup.clear(true, true); // Verwijder lijst-sprites
            }
            this.listText.setVisible(this.listVisible);
            this.listButton.setText(this.listVisible ? 'Verberg lijst' : 'Toon lijst');
        });

    this.input.on('pointerdown', (pointer, currentlyOver) => {
        // Voorkom summonen als je op een knop klikt
        if (!currentlyOver.includes(this.listButton) &&
            !currentlyOver.includes(this.upgradeButton) &&
            !currentlyOver.includes(this.autoClickButton) &&
            !currentlyOver.includes(this.saveButton) &&
            !currentlyOver.includes(this.importButton)) {
            if (!this.listVisible) {
                summonCreature.call(this);
            }
            // Als de lijst open is, alleen de lijst updaten (geen summon)
            if (this.listVisible) {
                this.listText.setText(getSummonedList(this.summoned));
            }
        }
    });
    // Voeg ook summonen toe op pointermove (vasthouden = snel klikken)
    this.input.on('pointermove', (pointer) => {
        if (pointer.isDown && !this.listVisible && !this.upgradeButton.input.pointerOver() && !this.autoClickButton.input.pointerOver()) {
            summonCreature.call(this);
        }
    });

    // Update posities dynamisch bij resize
    this.scale.on('resize', (gameSize) => {
        const width = gameSize.width;
        this.summonText.setPosition(width / 2, 70);
        this.listButton.setPosition(width / 2, 120);
        this.listText.setPosition(width / 2, 180);
    });

    this.money = 0;
    this.moneyText = this.add.text(120, 30, 'Geld: 0', { fontSize: '18px', fill: '#ff0', backgroundColor: '#333', padding: { x: 8, y: 4 } }).setOrigin(0.5);
    this.upgradeLevel = 0;
    this.autoClickLevel = 0;
    this.upgradeCost = 50; // Startkosten verhoogd
    this.autoClickCost = 200; // Startkosten verhoogd
    this.upgradeButton = this.add.text(this.scale.width - 120, 30, 'Upgrade (0)\nKosten: 50', { fontSize: '18px', fill: '#ff0', backgroundColor: '#333', padding: { x: 8, y: 4 } })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (pointer) => {
            if (this.money >= this.upgradeCost) {
                this.money -= this.upgradeCost;
                this.upgradeLevel++;
                this.upgradeCost = Math.floor(this.upgradeCost * 2.5);
                this.upgradeButton.setText('Upgrade (' + this.upgradeLevel + ')\nKosten: ' + this.upgradeCost);
                this.moneyText.setText('Geld: ' + this.money);
                // Forceer update van de pool direct na upgrade
                this.lastSummonWasUpgrade = true;
            }
        });
    this.autoClickButton = this.add.text(this.scale.width - 120, 80, 'Auto-klik (0)\nKosten: 200', { fontSize: '18px', fill: '#0ff', backgroundColor: '#333', padding: { x: 8, y: 4 } })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (pointer) => {
            if (this.money >= this.autoClickCost) {
                this.money -= this.autoClickCost;
                this.autoClickLevel++;
                this.autoClickCost = Math.floor(this.autoClickCost * 3); // Sterkere prijsstijging
                this.autoClickButton.setText('Auto-klik (' + this.autoClickLevel + ')\nKosten: ' + this.autoClickCost);
                this.moneyText.setText('Geld: ' + this.money);
                if (!this.autoClickTimer) {
                    this.autoClickTimer = this.time.addEvent({
                        delay: 1000, // 1 seconde
                        callback: () => {
                            for (let i = 0; i < this.autoClickLevel; i++) {
                                summonCreature.call(this);
                            }
                        },
                        callbackScope: this,
                        loop: true
                    });
                }
            }
        });
    // Save en import knoppen
    this.saveButton = this.add.text(120, 80, 'Opslaan', { fontSize: '18px', fill: '#fff', backgroundColor: '#333', padding: { x: 8, y: 4 } })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            const data = {
                summoned: this.summoned,
                money: this.money,
                upgradeLevel: this.upgradeLevel,
                autoClickLevel: this.autoClickLevel
            };
            // Versleutel data
            const json = JSON.stringify(data);
            const encrypted = btoa(encodeURIComponent(json).split('').map(c => String.fromCharCode(c.charCodeAt(0) + 3)).join(''));
            const blob = new Blob([encrypted], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'summon_save.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    this.importButton = this.add.text(120, 130, 'Importeer', { fontSize: '18px', fill: '#fff', backgroundColor: '#333', padding: { x: 8, y: 4 } })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const encrypted = evt.target.result;
                        const decrypted = decodeURIComponent(atob(encrypted).split('').map(c => String.fromCharCode(c.charCodeAt(0) - 3)).join(''));
                        const data = JSON.parse(decrypted);
                        this.summoned = data.summoned || [];
                        this.money = data.money || 0;
                        this.upgradeLevel = data.upgradeLevel || 0;
                        this.autoClickLevel = data.autoClickLevel || 0;
                        // Herbereken kosten op basis van geïmporteerde levels
                        this.upgradeCost = 50 * Math.pow(2.5, this.upgradeLevel);
                        this.upgradeCost = Math.floor(this.upgradeCost);
                        this.autoClickCost = 200 * Math.pow(3, this.autoClickLevel);
                        this.autoClickCost = Math.floor(this.autoClickCost);
                        this.moneyText.setText('Geld: ' + this.money);
                        this.upgradeButton.setText('Upgrade (' + this.upgradeLevel + ')\nKosten: ' + this.upgradeCost);
                        this.autoClickButton.setText('Auto-klik (' + this.autoClickLevel + ')\nKosten: ' + this.autoClickCost);
                        // Update summonText met juiste totaal
                        if (this.summoned.length > 0) {
                            const laatste = this.summoned[this.summoned.length - 1];
                            this.summonText.setText('Gesummoned: ' + laatste.name + ' (' + laatste.rarity + ')\nTotaal: ' + this.summoned.length);
                        } else {
                            this.summonText.setText('Klik om te summonen!');
                        }
                        this.spriteGroup.clear(true, true);
                        this.listSpritesGroup.clear(true, true);
                        this.listText.setText('');
                        // Fix: Herstart autoclicker timer als nodig
                        if (this.autoClickTimer) {
                            this.autoClickTimer.remove(false);
                            this.autoClickTimer = null;
                        }
                        if (this.autoClickLevel > 0) {
                            this.autoClickTimer = this.time.addEvent({
                                delay: 1000,
                                callback: () => {
                                    for (let i = 0; i < this.autoClickLevel; i++) {
                                        summonCreature.call(this);
                                    }
                                },
                                callbackScope: this,
                                loop: true
                            });
                        }
                    } catch (err) {
                        alert('Ongeldige of corrupte save file!');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });
    this.scale.on('resize', (gameSize) => {
        const width = gameSize.width;
        this.summonText.setPosition(width / 2, 70);
        this.listButton.setPosition(width / 2, 120);
        this.listText.setPosition(width / 2, 180);
        this.upgradeButton.setPosition(width - 120, 30);
        this.autoClickButton.setPosition(width - 120, 80);
        this.moneyText.setPosition(120, 30);
        this.saveButton.setPosition(120, 80);
        this.importButton.setPosition(120, 130);
    });
}

function update() {
    // Eventuele animaties of logica
}

function summonCreature(noSprite) {
    const creatures = [
        { name: 'Draak', rarity: 'Legendary' },
        { name: 'Feniks', rarity: 'Epic' },
        { name: 'Golem', rarity: 'Rare' },
        { name: 'Elf', rarity: 'Uncommon' },
        { name: 'Wolf', rarity: 'Common' },
        { name: 'Tovenaar', rarity: 'Rare' },
        { name: 'Slang', rarity: 'Uncommon' },
        { name: 'Vampier', rarity: 'Epic' },
        { name: 'Goblin', rarity: 'Common' },
        { name: 'Reus', rarity: 'Rare' },
        { name: 'Sprite', rarity: 'Uncommon' },
        { name: 'Zombie', rarity: 'Common' },
        { name: 'Eenhoorn', rarity: 'Legendary' },
        { name: 'Trol', rarity: 'Uncommon' },
        { name: 'Sfinx', rarity: 'Epic' },
        { name: 'Manticore', rarity: 'Epic' },
        { name: 'Minotaurus', rarity: 'Rare' },
        { name: 'Fee', rarity: 'Uncommon' },
        { name: 'Orc', rarity: 'Common' },
        { name: 'Hydra', rarity: 'Legendary' }
    ];
    // Rarity chances: Legendary 4, Epic 8, Rare 16, Uncommon 24, Common 48
    // Maak het moeilijker om zeldzame wezens te krijgen
    // Maak het nóg zeldzamer om rare, epic en legendary wezens te krijgen
    let rarityBoost = this.upgradeLevel * 0.01; // 1% per upgrade
    const pool = [
        ...creatures.filter(c => c.rarity === 'Legendary').flatMap(c => Array(1 + Math.floor(rarityBoost)).fill(c)),
        ...creatures.filter(c => c.rarity === 'Epic').flatMap(c => Array(2 + Math.floor(rarityBoost)).fill(c)),
        ...creatures.filter(c => c.rarity === 'Rare').flatMap(c => Array(4 + Math.floor(rarityBoost)).fill(c)),
        ...creatures.filter(c => c.rarity === 'Uncommon').flatMap(c => Array(25).fill(c)),
        ...creatures.filter(c => c.rarity === 'Common').flatMap(c => Array(60 - Math.floor(rarityBoost * 10)).fill(c)),
    ];
    // Forceer pool update na upgrade
    if (this.lastSummonWasUpgrade) {
        this.lastSummonWasUpgrade = false;
    }
    const creature = Phaser.Utils.Array.GetRandom(pool);
    this.summoned.push(creature);
    this.summonText.setText('Gesummoned: ' + creature.name + ' (' + creature.rarity + ')\nTotaal: ' + this.summoned.length);
    if (this.listVisible) {
        this.listText.setText(getSummonedList(this.summoned));
    }
    // Alleen sprite tonen als noSprite niet waar is
    if (!noSprite) {
        const x = Phaser.Math.Between(60, this.scale.width - 60);
        const y = Phaser.Math.Between(250, this.scale.height - 60);
        const sprite = this.add.image(x, y, creature.name).setDisplaySize(40, 40);
        this.spriteGroup.add(sprite);
    }
    // Geef geld op basis van rarity
    const rarityMoney = {
        'Legendary': 100,
        'Epic': 25,
        'Rare': 10,
        'Uncommon': 3,
        'Common': 1
    };
    this.money += rarityMoney[creature.rarity] || 1;
    if (this.moneyText) this.moneyText.setText('Geld: ' + this.money);
}

function showListSprites() {
    this.listSpritesGroup.clear(true, true);
    const counts = {};
    this.summoned.forEach(c => {
        const key = c.name + ' (' + c.rarity + ')';
        counts[key] = counts[key] || { ...c, count: 0 };
        counts[key].count++;
    });
    const entries = Object.values(counts);
    const columns = 2;
    const spriteSize = 32;
    const spacingX = 180;
    const spacingY = 50;
    const startX = this.scale.width / 2 - spacingX / 2;
    const startY = 220;
    entries.forEach((entry, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = startX + col * spacingX;
        const y = startY + row * spacingY;
        const sprite = this.add.image(x, y, entry.name).setDisplaySize(spriteSize, spriteSize);
        this.listSpritesGroup.add(sprite);
        // Tekst onder sprite
        const text = this.add.text(x, y + spriteSize / 2 + 4, `${entry.name} (${entry.rarity}): ${entry.count}`, { fontSize: '14px', fill: '#fff' })
            .setOrigin(0.5, 0)
            .setDepth(1)
            .setAlpha(0.95);
        this.listSpritesGroup.add(text);
    });
}

function getSummonedList(summoned) {
    if (summoned.length === 0) return 'Nog geen wezens gesummoned.';
    const counts = {};
    summoned.forEach(c => {
        const key = c.name + ' (' + c.rarity + ')';
        counts[key] = (counts[key] || 0) + 1;
    });
    // Maak een grid: 2 kolommen
    const entries = Object.entries(counts).map(([name, count]) => `${name}: ${count}`);
    const columns = 2;
    let grid = '';
    for (let i = 0; i < entries.length; i += columns) {
        grid += entries.slice(i, i + columns).join('    ') + '\n';
    }
    return;
}
