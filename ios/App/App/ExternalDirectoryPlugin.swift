import Capacitor
import UIKit
import UniformTypeIdentifiers

@objc(ExternalDirectoryPlugin)
public class ExternalDirectoryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ExternalDirectoryPlugin"
    public let jsName = "ExternalDirectory"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pickDirectory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickFiles", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restoreAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "releaseAccess", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private var picker: UIDocumentPickerViewController?
    private var activeResources: [String: URL] = [:]
    private var pickingDirectory = false

    @objc public func pickDirectory(_ call: CAPPluginCall) {
        presentPicker(for: [.folder], multiple: false, directory: true, call: call)
    }

    @objc public func pickFiles(_ call: CAPPluginCall) {
        let extensions = call.getArray("extensions", String.self) ?? []
        let types = extensions.compactMap { UTType(filenameExtension: $0) }
        let contentTypes = types.isEmpty ? [.data] : types
        let multiple = call.getBool("multiple") ?? false
        presentPicker(for: contentTypes, multiple: multiple, directory: false, call: call)
    }

    @objc public func restoreAccess(_ call: CAPPluginCall) {
        guard let encodedBookmark = call.getString("bookmark"),
              let bookmark = Data(base64Encoded: encodedBookmark) else {
            call.reject("A valid directory bookmark is required")
            return
        }

        do {
            var isStale = false
            let url = try URL(
                resolvingBookmarkData: bookmark,
                options: [.withSecurityScope],
                relativeTo: nil,
                bookmarkDataIsStale: &isStale
            )

            guard url.startAccessingSecurityScopedResource() else {
                call.reject("The previously selected location is no longer accessible")
                return
            }

            activeResources[normalisedPath(for: url)] = url

            var refreshedBookmark = encodedBookmark
            if isStale {
                refreshedBookmark = try url
                    .bookmarkData(options: [.withSecurityScope], includingResourceValuesForKeys: nil, relativeTo: nil)
                    .base64EncodedString()
            }

            call.resolve([
                "filePath": normalisedPath(for: url),
                "bookmark": refreshedBookmark,
                "stale": isStale
            ])
        } catch {
            call.reject("Unable to restore access to the selected location: \(error.localizedDescription)")
        }
    }

    @objc public func releaseAccess(_ call: CAPPluginCall) {
        if let filePath = call.getString("filePath"),
           let url = activeResources.removeValue(forKey: filePath) {
            url.stopAccessingSecurityScopedResource()
        }

        call.resolve()
    }

    private func presentPicker(
        for contentTypes: [UTType],
        multiple: Bool,
        directory: Bool,
        call: CAPPluginCall
    ) {
        DispatchQueue.main.async {
            guard self.pendingCall == nil else {
                call.reject("A file picker is already open")
                return
            }

            let picker = UIDocumentPickerViewController(
                forOpeningContentTypes: contentTypes,
                asCopy: false
            )
            picker.delegate = self
            picker.allowsMultipleSelection = multiple
            picker.shouldShowFileExtensions = true

            self.pendingCall = call
            self.picker = picker
            self.pickingDirectory = directory

            guard let viewController = self.bridge?.viewController else {
                self.clearPicker()
                call.reject("The app view is not available")
                return
            }

            viewController.present(picker, animated: true)
        }
    }

    private func clearPicker() {
        pendingCall = nil
        picker = nil
        pickingDirectory = false
    }

    private func normalisedPath(for url: URL) -> String {
        var path = url.absoluteString

        if url.hasDirectoryPath && path != "file:///" {
            while path.hasSuffix("/") {
                path.removeLast()
            }
        }

        return path
    }

    deinit {
        activeResources.values.forEach {
            $0.stopAccessingSecurityScopedResource()
        }
    }
}

extension ExternalDirectoryPlugin: UIDocumentPickerDelegate {
    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pendingCall?.resolve(["canceled": true, "filePaths": []])
        clearPicker()
    }

    public func documentPicker(
        _ controller: UIDocumentPickerViewController,
        didPickDocumentsAt urls: [URL]
    ) {
        guard let call = pendingCall else {
            clearPicker()
            return
        }

        do {
            let bookmarks = try urls.map { url -> String in
                guard url.startAccessingSecurityScopedResource() else {
                    throw NSError(
                        domain: "ExternalDirectoryPlugin",
                        code: 1,
                        userInfo: [NSLocalizedDescriptionKey: "The selected file is not accessible"]
                    )
                }

                activeResources[normalisedPath(for: url)] = url
                return try url
                    .bookmarkData(options: [.withSecurityScope], includingResourceValuesForKeys: nil, relativeTo: nil)
                    .base64EncodedString()
            }

            let filePaths = urls.map { normalisedPath(for: $0) }
            var result: [String: Any] = [
                "canceled": false,
                "filePaths": filePaths,
                "bookmarks": bookmarks
            ]

            if pickingDirectory, let bookmark = bookmarks.first {
                result["bookmark"] = bookmark
            }

            call.resolve(result)
        } catch {
            call.reject("Unable to retain access to the selected location: \(error.localizedDescription)")
        }

        clearPicker()
    }
}
