import { expect, assert } from 'chai';
import td from 'testdouble';
import { RemoteProcess } from '../../src/remoteprocess';

const containsJson = td.matchers.create({
    name: 'isJson',
    matches: (args, actual) => {
        try {
            const expectedJson = JSON.parse(actual);
            const receivedJson = args[0];
            const matcher = td.matchers.contains(receivedJson);
            return matcher.__matches(expectedJson);
        } catch (e) {
            return false;
        }
    }
});

describe('RemoteProcess', () => {

    const url = 'ws://localhost:8000/ws/';
    let socket = null;
    let process = null;

    beforeEach(() => {
        socket = td.object();
        const createSocketMock = td.function();
        td.when(createSocketMock(
            td.matchers.contains(url)
        )).thenReturn(socket);
        process = new RemoteProcess(createSocketMock);
    });

    describe('Connection', () => {

        beforeEach(() => {
            process.connect(url);
        });

        it('Connection creates socket with callbacks', () => {
            assert.isFunction(socket.onopen);
            assert.isFunction(socket.onmessage);
            assert.isFunction(socket.onclose);
            assert.isFunction(socket.onerror);
        });

        it('Connection is possible only once', () => {
            assert.throws(() => {
                process.connect(url);
            }, Error);
        });

        it('Start command is sent after opening connection', () => {
            socket.onopen();
            td.verify(
                socket.send(
                    containsJson({ cmd: 'start' })
                )
            );
        });
    });

    describe('Connected', () => {

        beforeEach(() => {
            process.connect(url);
            socket.onopen();
        });

        it('Start command is sent after opening connection', () => {
            td.verify(
                socket.send(
                    containsJson({ cmd: 'start' })
                )
            );
        });

        it('Incoming status trigges onStart() callback', () => {
            const json = JSON.stringify(
                {
                    status: 'start'
                }
            );
            process.onStart = td.function();
            socket.onmessage({ data: json });
            td.verify(
                process.onStart()
            );
        });

        it('Incoming output trigges onOutput() callback', () => {
            const json = JSON.stringify(
                {
                    status: 'running',
                    output: ['a line of text']
                }
            );
            process.onOutput = td.function();
            socket.onmessage({ data: json });
            td.verify(
                process.onOutput(
                    td.matchers.isA(Array)
                )
            );
        });

        it('Incoming status trigges onFinish() callback', () => {
            const json = JSON.stringify(
                {
                    status: 'finish'
                }
            );
            process.onFinish = td.function();
            socket.onmessage({ data: json });
            td.verify(
                process.onFinish()
            );
        });
    });
});
