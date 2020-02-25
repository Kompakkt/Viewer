describe("Home", () => {
    it("should visit home page", () => {
        cy.visit("/");
        cy.location('pathname').should('eq', '/')
    });
});
