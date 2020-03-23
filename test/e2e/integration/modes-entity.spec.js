describe('Entity Modes', () => {
    it('should open an entity with annotations', () => {
        cy.visit('/?entity=5d6f429b72b3dc766b27d74d&mode=open');
        cy.get('#btn-next').click();
        cy.get('.annotation-form .mat-card-title')
            .should('be.visible')
            .and('contain', 'Hi there!');
    });

    it('should open an entity in annotation mode', () => {
        cy.visit('/?entity=5d6f429b72b3dc766b27d74d&mode=annotation');
        cy.get('#btn-next').click();
        cy.get('.annotation-form .mat-card-title')
            .should('be.visible')
            .and('contain', 'Hi there!');
        cy.get('#annotations-droplist > :nth-child(1) #annotation-content > p')
            .should('contain', 'I am a cat');
    });

    it('should open an entity in explore mode', () => {
        cy.visit('/?entity=5d6f429b72b3dc766b27d74d&mode=explore');
        cy.get('#resetDefaultSettings').
            should('be.visible')
            .and('contain', 'Back to Default');
    });
});
