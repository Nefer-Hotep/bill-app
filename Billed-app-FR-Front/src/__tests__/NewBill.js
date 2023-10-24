/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { screen, fireEvent } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import NewBillUI from '../views/NewBillUI.js';
import NewBill from '../containers/NewBill.js';
import { ROUTES, ROUTES_PATH } from '../constants/routes.js';
import mockStore from '../__mocks__/store';
import { localStorageMock } from '../__mocks__/localStorage.js';
import { bills } from '../fixtures/bills.js';
import router from '../app/Router.js';

// Telling Jest to replace the store module from the app directory
// with mockStore whenever store is imported in the code under test.
jest.mock('../app/store', () => mockStore);
// I make sure here that my test setup is created before each test to avoid test redundancy.
beforeEach(() => {
    // Mock the window's `localStorage` object. This is done to isolate the test environment
    // and not make actual changes to the browser's localStorage.
    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
    });
    // Set an item in the mocked localStorage.
    // This simulates having user data stored before running the test.
    localStorage.setItem(
        'user',
        JSON.stringify({
            type: 'Employee',
            email: 'a@a',
        })
    );
    // Create the root div for the router
    const root = document.createElement('div');
    root.setAttribute('id', 'root');
    document.body.append(root);
    // Call the `router` function to initializes or starts routing.
    router();
    // Use the `onNavigate` function to navigate to the NewBill route.
    window.onNavigate(ROUTES_PATH.NewBill);
});

afterEach(() => {
    // Remove the dom after each test and restore it.
    document.body.innerHTML = '';
    // Restore the spied method to its original state.
    jest.restoreAllMocks();
});

describe('Given I am connected as an employee', () => {
    describe('When I am on NewBill Page', () => {
        // INTEGRATION TEST (POST)
        test('The user POST a newbill and the bill page is rendered', () => {
            // This function change the routes pathname to change the html when handleSubmit is called
            const onNavigate = (pathname) => {
                document.body.innerHTML = ROUTES({ pathname });
            };
            // Call a instance of NewBill
            const newBill = new NewBill({
                document: document,
                onNavigate,
                store: mockStore,
                localStorage: window.localStorage,
            });

            // Spy on handleSubmit
            const handleSubmitSpy = jest.spyOn(newBill, 'handleSubmit');
            // Simulate the user clicking on submit
            const submitButton = screen.getByRole('button', 'Envoyer');
            const form = screen.getByTestId('form-new-bill');
            form.addEventListener('submit', handleSubmitSpy);
            userEvent.click(submitButton);

            // Test button, function and dom.
            expect(submitButton.type).toBe('submit');
            expect(handleSubmitSpy).toHaveBeenCalledTimes(1);
            expect(screen.getByText('Mes notes de frais')).toBeVisible();
        });

        test('All inputs are rendered and the output value type are correct', () => {
            document.body.innerHTML = NewBillUI();

            // Take the first bill from the fixed data
            const fixedData = bills[0];

            // Mock user input
            userEvent.selectOptions(
                screen.getByTestId('expense-type'),
                fixedData.type
            );
            userEvent.type(screen.getByTestId('expense-name'), fixedData.name);
            userEvent.type(
                screen.getByTestId('amount'),
                fixedData.amount.toString()
            );

            // Directly set the value of the datepicker because dates can't use userEvent
            screen.getByTestId('datepicker').value = fixedData.date;
            // Dispatch an input event to simulate user typing
            fireEvent.input(screen.getByTestId('datepicker'));

            userEvent.type(screen.getByTestId('vat'), fixedData.vat);
            userEvent.type(screen.getByTestId('pct'), fixedData.pct.toString());
            userEvent.type(
                screen.getByTestId('commentary'),
                fixedData.commentary
            );

            // Test that the input doesn't have missing values.
            expect(screen.getByTestId('expense-type')).toHaveValue(
                'Hôtel et logement'
            );
            expect(screen.getByTestId('expense-name')).toHaveValue('encore');
            expect(screen.getByTestId('amount')).toHaveValue(400);
            expect(screen.getByTestId('datepicker')).toHaveValue('2004-04-04');
            expect(screen.getByTestId('vat')).toHaveValue(80);
            expect(screen.getByTestId('pct')).toHaveValue(20);
            expect(screen.getByTestId('commentary')).toHaveValue(
                'séminaire billed'
            );
        });

        test('The file change properly when the input is used', () => {
            // Call a instance of NewBill
            const newBill = new NewBill({
                document: document,
                onNavigate,
                store: mockStore,
                localStorage: window.localStorage,
            });

            // Spy on handleChangeFile
            const handleChangeFileSpy = jest.spyOn(newBill, 'handleChangeFile');

            // Mock file input
            const file = screen.getByTestId('file');
            file.addEventListener('change', handleChangeFileSpy);
            fireEvent.change(file, {
                target: {
                    files: [
                        new File(['file.png'], 'file.png', {
                            type: 'image/png',
                        }),
                    ],
                },
            });

            // Assert that handleChangeFileSpy has been called
            expect(handleChangeFileSpy).toHaveBeenCalledTimes(1);
        });

        test('A 500 error occurs (server fail)', async () => {
            // Mock functions : mockStore.bills and console.error()
            jest.spyOn(mockStore, 'bills');
            // Spy on console.error to observe if errors are being correctly logged
            console.error = jest.fn();
            // Mock the bills method of mockStore to return an object
            mockStore.bills.mockImplementationOnce(() => {
                return {
                    update: () => {
                        return Promise.reject({
                            message: 'Erreur 500',
                            status: 500,
                        });
                    },
                };
            });
            // Call a instance of NewBill
            const newBill = new NewBill({
                document,
                onNavigate,
                store: mockStore,
                localStorage: window.localStorage,
            });
            // Getting references to DOM elements
            const form = screen.getByTestId('form-new-bill');
            const submitButton = screen.getByRole('button', 'Envoyer');
            // Simulate user interaction
            const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
            form.addEventListener('submit', handleSubmit);
            userEvent.click(submitButton);

            // Assert that handleSubmit was called
            expect(handleSubmit).toHaveBeenCalled();
            // Use a promise to wait for all micro-tasks to complete
            await new Promise(process.nextTick);
            // Assert to ensure that an error was logged
            expect(console.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Erreur 500',
                    status: 500,
                })
            );
        });
    });
});
