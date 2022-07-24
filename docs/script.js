const API_URL = 'https://62dc2d424438813a2612aa65.mockapi.io/api/todos';

class Todo {
    constructor({id, name, creationDate, node, notes}) {
        this.id = id;
        this.name = name;
        this.creationDate = creationDate;
        this.node = node;
        this.notes = notes;
    }
}

class TodoInputController {
    constructor({todoController, todoApiService, todoHandler}, formNode) {
        this._todoController = todoController;
        this._todoApiService = todoApiService;
        this._todoHandler = todoHandler;

        this._setListeners(formNode);
    }

    _setListeners(formNode) {
        formNode.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const formData = new FormData(e.target);
            const inputValue = formData.get('add-todo-input');

            if (!inputValue) {
                return null;
            }

            const todo = {name: inputValue, creationDate: new Date(), status: false};

            this._todoApiService.create(todo).then(response => {
                const newTodo = this._todoController.create({...response, notes: ''});
                this._todoHandler.addListeners(newTodo);
                formNode.reset();
            });
        });
    }
}

class EditFormController {
    constructor({apiService, todosController}, formNode, modalId) {
        this._apiService = apiService;
        this._todosController = todosController;
        this._modal = new bootstrap.Modal(document.getElementById(modalId));
        this._formNode = formNode;

        this._todo = null;
        this._addListeners(formNode);
    }

    _addListeners(formNode) {
        formNode.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const formData = new FormData(e.target);
            const name = formData.get('titleInput');
            const notes = formData.get('notesInput');

            this._apiService.update({...this._todo, name, notes}).then((res) => {
                this._todosController.update(res, 'notes');
                this._modal.hide();
            });
        });

        formNode.addEventListener('reset', () => {
            this.setTodo(null);
        });
    }

    setTodo(todo) {
        this._todo = todo;

        if(todo) {
            this._formNode.querySelector('#titleInput').value = todo.name;
            this._formNode.querySelector('#notesInput').value = todo.notes;
        }
    }
}

class TodoCreator {
    _createLi(status) {
        const listItem = document.createElement('li');

        listItem.className = 'rounded py-2 px-4' + (status ? ' done' : '');

        return listItem;
    }

    _createLoader() {
        const loader = document.createElement('div');
        const loaderInnerText = document.createElement('span');

        loader.className = 'spinner-border text-primary hidden';
        loader.setAttribute('role', 'status');

        loaderInnerText.className = 'visually-hidden';
        loaderInnerText.innerText = 'Loading...';

        loader.append(loaderInnerText);

        return loader;
    }

    _createLabel(id, name) {
        const label = document.createElement('label');

        label.className = 'name me-1';
        label.setAttribute('for', `status-${id}`);
        label.setAttribute('title', name);
        label.innerText = name;

        return label;
    }

    _createControlsContainer() {
        const controls = document.createElement('div');

        controls.className = 'controls';

        return controls;
    }

    _createDeleteBtn() {
        const deleteBtn = document.createElement('button');

        deleteBtn.className = 'btn btn-sm btn-danger me-3';
        deleteBtn.innerText = 'Delete';

        return deleteBtn;
    }

    _createStatusCheckbox(id, status) {
        const statusCheckbox = document.createElement('input');

        statusCheckbox.className = 'form-check-input';
        statusCheckbox.setAttribute('id', `status-${id}`);
        statusCheckbox.setAttribute('name', `status-${id}`);
        statusCheckbox.setAttribute('type', 'checkbox');
        statusCheckbox.checked = status;

        return statusCheckbox;
    }

    _createEditButton() {
        const editBtn = document.createElement('button');
        const editIcon = document.createElement('i');

        editBtn.className = 'edit-btn btn btn-sm btn-primary me-3';
        editBtn.setAttribute('type', 'button');
        editBtn.setAttribute('data-bs-toggle', 'modal');
        editBtn.setAttribute('data-bs-target', '#editModal');
        editIcon.className = 'bi bi-pencil';
        editBtn.append(editIcon);

        return editBtn;
    }

    createTodo({id, name, creationDate, status}) {
        const li = this._createLi(status);
        const label = this._createLabel(id, name);
        const controlsContainer = this._createControlsContainer();
        const deleteBtn = this._createDeleteBtn();
        const statusCheckbox = this._createStatusCheckbox(id, status);
        const loader = this._createLoader();
        const editBtn = this._createEditButton();

        controlsContainer.append(deleteBtn, editBtn, statusCheckbox);
        li.append(label, controlsContainer, loader);

        return li;
    }
}

class TodoController {
    constructor({todoCreator}, todoList) {
        this._todoList = todoList;
        this._todoCreator = todoCreator;

        this.allTodos = {};
    }

    takeRawData(todo) {
        const rawTodo = {...todo};
        delete rawTodo.node;

        return rawTodo;
    }

    startLoading(todoId) {
        const todo = this.takeById(todoId);
        if(todo) {
            const loader = todo.node.querySelector('.spinner-border');

            loader.classList.remove('hidden');
        }
    }

    endLoading(todoId) {
        const todo = this.takeById(todoId);
        if(todo) {
            const loader = todo.node.querySelector('.spinner-border');

            loader.classList.add('hidden');
        }
    }

    remove(id) {
        try {
            const { node } = this.takeById(id);

            node.remove();
            delete this.allTodos[id];
        } catch (e) {
            console.error(`Todo with such id not found: ${e}`);
        }
    }

    _updateStatus(oldTodo, newTodo) {
        if (newTodo.status === oldTodo.status) {
            return false;
        }

        oldTodo.status = newTodo.status;
        if (newTodo.status) {
            oldTodo.node.classList.add('done');
        } else {
            oldTodo.node.classList.remove('done');
        }
    }

    _updateNotes(todo, node) {
        this.takeById(todo.id).notes = todo.notes;
        this.takeById(todo.id).name = todo.name;

        node.querySelector('.name').innerText = todo.name;
    }

    update(todo, key) {
        try {
            const oldTodo = this.takeById(todo.id);

            switch (key) {
                case 'status':
                    if (todo.status !== oldTodo.status) {
                        this._updateStatus(oldTodo, todo);
                    }
                break;
                case 'notes':
                    this._updateNotes(todo, oldTodo.node);
                break;
            }
        } catch (e) {
            console.error(`Todo with such id not found: ${e}`);
        }
    }

    takeById(id) {
        return this.allTodos[id];
    }

    create(todo) {
        const li = this._todoCreator.createTodo(todo);
        const newTodoElement = new Todo({
            ...todo,
            node: li,
        });

        this._todoList.append(li);
        this.allTodos[todo.id] = newTodoElement;

        return newTodoElement;
    }
}

class TodoApiService {
    constructor(apiUrl) {
        this._API_URL = apiUrl;
        this.headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }

    delete(id) {
        return fetch(`${this._API_URL}/${id}`, {method: 'DELETE', headers: this.headers})
            .catch(err => console.error(err));
    }

    create(todo) {
        return fetch(`${this._API_URL}`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(todo),
        })
            .catch(err => console.error(err))
            .then(res => res.json());
    }

    update(todo) {
        return fetch(`${this._API_URL}/${todo.id}`, {
            method: 'PUT',
            headers: this.headers,
            body: JSON.stringify(todo),
        })
            .catch(err => console.error(err))
            .then(res => res.json());
    }

    getAll() {
        return fetch(this._API_URL, {headers: this.headers})
            .catch(err => console.error(err))
            .then(res => res.json());
    }
}

class TodoHandler {
    constructor({todoController, todoApiService, editFromController}) {
        this._todoController = todoController;
        this._todoApiService = todoApiService;
        this._editFromController = editFromController;
    }

    addListeners(todo) {
        const deleteBtn = todo.node.querySelector('.btn-danger');
        const checkbox = todo.node.querySelector('.form-check-input');
        const editBtn = todo.node.querySelector('.edit-btn');

        deleteBtn.addEventListener('click', () => {
            this._delete(todo.id);
        });

        checkbox.addEventListener('input', (e) => {
            const rawTodo = this._todoController.takeRawData(todo);
            this._updateStatus({...rawTodo, status: e.target.checked});
        });

        editBtn.addEventListener('click', () => {
            this._editFromController.setTodo(todo);
        });
    }

    _delete(id) {
        this._todoController.startLoading(id);
        this._todoApiService.delete(id)
            .then(() => {
                this._todoController.remove(id);
                this._todoController.endLoading(id);
            });
    }

    _updateStatus(todo) {
        this._todoController.startLoading(todo.id);
        this._todoApiService.update(todo)
            .then((res) => {
                this._todoController.update(res, 'status');
                this._todoController.endLoading(res.id);
            });
    }
}

window.addEventListener('load', () => {
    const todoContainer = document.getElementById('todo-container');

    const todoList = todoContainer.querySelector('#todo-list');
    const loader = todoContainer.querySelector('.main-loading');
    const editForm = document.querySelector('#editModalForm');

    const creator = new TodoCreator();
    const controller = new TodoController({todoCreator: creator}, todoList);
    const apiService = new TodoApiService(API_URL);
    const editFromController = new EditFormController({
        apiService,
        todosController: controller
    }, editForm, 'editModal');
    const handler = new TodoHandler({
        todoController: controller,
        todoApiService: apiService,
        editFromController,
    });
    const todoInputController = new TodoInputController(
        {todoController: controller, todoApiService: apiService, todoHandler: handler},
        document.querySelector('#add-todo-form'),
    );

    apiService.getAll()
        .then(todos => {
            todos.forEach(todo => {
                const newTodo = controller.create(todo);

                handler.addListeners(newTodo);
            });
            loader.style.display = 'none';
        });
});
