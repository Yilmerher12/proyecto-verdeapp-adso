import { test, expect } from '@playwright/test';

/*
    ¿Qué? Configuración que se aplica a todos los tests de este archivo: el idioma del navegador.
    ¿Para qué? Fijar el español de Colombia para que los nombres de los elementos (etiquetas y botones) sean siempre los mismos.
    ¿Impacto? Sin esto, la app se mostraría en el idioma del equipo que corre el test y los locators dejarían de encontrar los elementos.
              Tampoco hace falta un test por idioma: cada test prueba un proceso concreto, no el idioma.
*/
test.use({ locale: 'es-CO' });

test('should show the resident dashboard when logging with valid credentials', async ({ page }) => {
    // Arrange
    await page.goto('/login');
    const email = process.env.E2E_RESIDENT_EMAIL;
    const password = process.env.E2E_RESIDENT_PASSWORD;

    // Act
    await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(email);
    
    await page.getByRole('textbox', { name: 'Contraseña' }).fill(password);
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    // Assert
    await expect(page.getByRole('complementary').getByText('Residente', { exact: true })).toBeVisible();
});